
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LifestyleProfile, UploadedFile } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { PDFDocument } from "pdf-lib";

/** 
 * Reduced from 1000 to 250. 
 * Strata documents are often dense scans; 1000 pages can easily exceed 1M tokens.
 */
const MAX_PAGES_PER_BUCKET = 250;

/**
 * Robust base64 to Uint8Array conversion to avoid stack overflow on large files
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Robust Uint8Array to base64 conversion to avoid stack overflow on large files
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Improved JSON cleaning to handle trailing commas and markdown artifacts
 */
function cleanJsonString(str: string): string {
  // Remove markdown code blocks if present
  let cleaned = str.replace(/```json/g, "").replace(/```/g, "").trim();
  
  // Isolate the JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Remove trailing commas in arrays and objects: [1, 2, ] -> [1, 2] or {a:1, } -> {a:1}
  // This is a common source of "Expected ',' or ']'" errors in LLM generated JSON
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  return cleaned;
}

/**
 * Utility to count pages in a PDF or assume 1 for images
 */
async function getPageCount(file: UploadedFile): Promise<number> {
  if (file.type !== "application/pdf") return 1;
  try {
    const bytes = base64ToUint8Array(file.base64);
    const pdfDoc = await PDFDocument.load(bytes);
    return pdfDoc.getPageCount();
  } catch (e) {
    console.warn("Could not count pages for", file.name, e);
    return 1;
  }
}

/**
 * Splits a single PDF into smaller buckets
 */
async function splitLargePdf(file: UploadedFile): Promise<UploadedFile[]> {
  if (file.type !== "application/pdf") return [file];
  
  const originalBytes = base64ToUint8Array(file.base64);
  const pdfDoc = await PDFDocument.load(originalBytes);
  const totalPages = pdfDoc.getPageCount();
  
  if (totalPages <= MAX_PAGES_PER_BUCKET) return [file];
  
  const chunks: UploadedFile[] = [];
  for (let i = 0; i < totalPages; i += MAX_PAGES_PER_BUCKET) {
    const end = Math.min(i + MAX_PAGES_PER_BUCKET, totalPages);
    const subDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - i }, (_, k) => i + k);
    const pages = await subDoc.copyPages(pdfDoc, indices);
    pages.forEach(p => subDoc.addPage(p));
    
    const bytes = await subDoc.save();
    const base64 = uint8ArrayToBase64(bytes);
    chunks.push({
      ...file,
      name: `${file.name} (Pages ${i + 1}-${end})`,
      base64
    });
  }
  return chunks;
}

async function runAnalysisBatch(
  ai: any,
  files: UploadedFile[],
  profileDescription: string,
  isSynthesis: boolean = false,
  previousResults: AnalysisResult[] = []
): Promise<AnalysisResult> {
  const fileParts = files.map(file => ({
    inlineData: {
      data: file.base64,
      mimeType: file.type || "application/pdf"
    }
  }));

  let prompt = "";
  if (isSynthesis) {
    prompt = `
      SYNTHESIS TASK:
      You are provided with multiple partial forensic strata reports generated from different segments of a large document set.
      Merge them into one final, cohesive 10-year forensic living simulation.
      
      CRITICAL INSTRUCTIONS:
      1. Aggregate 'redTeamSummary' ensuring NO DUPLICATES and accurate source citations.
      2. Construct a UNIFIED 'timeline' representing exactly 10 years. Merge overlapping events.
      3. Average the 'financialWarGaming' values for each year to provide a stable forecast.
      4. De-duplicate 'amenities' and 'lifestyleConflicts' into unique lists.
      5. Weigh the final 'riskScore' and 'conclusion' based on the most severe findings from any segment.
      
      Partial Reports Data:
      ${JSON.stringify(previousResults)}
    `;
  } else {
    prompt = `
      Conduct a 10-year forensic living simulation.
      Profile: ${profileDescription}

      Key Objectives:
      1. Search for real rental market data for the address/suburb found in documents.
      2. If Occupier + Mortgage: Provide a Rent vs Buy comparison.
      3. If Occupier + Light Sleeper: Scrutinize minutes for specific nighttime noise issues.
      
      Constraint: Respond strictly in VALID JSON. Ensure no trailing commas.
    `;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: isSynthesis ? [{ text: prompt }] : [{ parts: [...fileParts, { text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 8000 },
      tools: isSynthesis ? [] : [{ googleSearch: {} }],
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER },
          redTeamSummary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                source: {
                  type: Type.OBJECT,
                  properties: {
                    fileName: { type: Type.STRING },
                    pageNumber: { type: Type.STRING },
                  },
                  required: ["fileName", "pageNumber"]
                }
              },
              required: ["content"]
            }
          },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.NUMBER },
                event: { type: Type.STRING },
                cost: { type: Type.STRING },
                severity: { type: Type.STRING },
                description: { type: Type.STRING },
                resolution: { type: Type.STRING },
              },
              required: ["year", "event", "cost", "severity", "description", "resolution"]
            }
          },
          lifestyleConflicts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                bylaw: { type: Type.STRING },
                conflict: { type: Type.STRING },
                recommendation: { type: Type.STRING },
              },
              required: ["bylaw", "conflict", "recommendation"]
            }
          },
          financialWarGaming: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.NUMBER },
                expectedCost: { type: Type.NUMBER },
                fundBalance: { type: Type.NUMBER },
                levyImpact: { type: Type.NUMBER },
                yieldImpact: { type: Type.NUMBER },
                totalMonthlyOwnershipCost: { type: Type.NUMBER },
              },
              required: ["year", "expectedCost", "fundBalance", "levyImpact"]
            }
          },
          amenities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                condition: { type: Type.STRING },
                forecastedMaintenanceYear: { type: Type.NUMBER },
                estimatedCost: { type: Type.STRING },
              },
              required: ["name", "condition", "forecastedMaintenanceYear", "estimatedCost"]
            }
          },
          recommendedRent: {
            type: Type.OBJECT,
            properties: {
              weekly: { type: Type.NUMBER },
              annual: { type: Type.NUMBER },
              justification: { type: Type.STRING },
            },
            required: ["weekly", "annual", "justification"]
          },
          rentVsBuy: {
            type: Type.OBJECT,
            properties: {
              monthlyOwnershipCost: { type: Type.NUMBER },
              marketRentEquivalent: { type: Type.NUMBER },
              tenYearTotalDelta: { type: Type.NUMBER },
              comparablePropertyLink: { type: Type.STRING },
              justification: { type: Type.STRING },
              yearlyProjection: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    year: { type: Type.NUMBER },
                    ownershipCost: { type: Type.NUMBER },
                    estimatedRent: { type: Type.NUMBER },
                  },
                  required: ["year", "ownershipCost", "estimatedRent"]
                }
              }
            },
            required: ["monthlyOwnershipCost", "marketRentEquivalent", "tenYearTotalDelta", "justification", "yearlyProjection"]
          },
          conclusion: { type: Type.STRING }
        },
        required: ["riskScore", "redTeamSummary", "timeline", "lifestyleConflicts", "financialWarGaming", "amenities", "conclusion"]
      }
    }
  });

  const rawText = response.text || "{}";
  try {
    const cleanedText = cleanJsonString(rawText);
    return JSON.parse(cleanedText) as AnalysisResult;
  } catch (err) {
    console.error("JSON Parsing failed for text:", rawText);
    throw new Error(`Failed to parse analysis results: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function analyzeProperty(
  files: UploadedFile[],
  lifestyle: LifestyleProfile
): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  let profileDescription = "";
  if (lifestyle.persona === 'investor' && lifestyle.investor) {
    profileDescription = `Investor Profile: $${lifestyle.investor.propertyValue} value, ${lifestyle.investor.expectedRentalYield}% yield, $${lifestyle.investor.loanSize} loan at ${lifestyle.investor.interestRate}% interest.`;
  } else if (lifestyle.persona === 'occupier' && lifestyle.occupier) {
    profileDescription = `Owner/Occupier Profile: Pets: ${lifestyle.occupier.pets}, Hobbies: ${lifestyle.occupier.hobbies}, Sleeping: ${lifestyle.occupier.sleepingHabits}. ${lifestyle.occupier.hasMortgage ? `Loan $${lifestyle.occupier.loanSize} at ${lifestyle.occupier.interestRate}%` : 'No mortgage'}.`;
  }

  const expandedFiles: UploadedFile[] = [];
  for (const f of files) {
    const split = await splitLargePdf(f);
    expandedFiles.push(...split);
  }

  const buckets: UploadedFile[][] = [];
  let currentBucket: UploadedFile[] = [];
  let currentBucketPages = 0;

  for (const f of expandedFiles) {
    const pages = await getPageCount(f);
    if (currentBucketPages + pages > MAX_PAGES_PER_BUCKET && currentBucket.length > 0) {
      buckets.push(currentBucket);
      currentBucket = [];
      currentBucketPages = 0;
    }
    currentBucket.push(f);
    currentBucketPages += pages;
  }
  if (currentBucket.length > 0) buckets.push(currentBucket);

  const partialResults: AnalysisResult[] = [];
  for (const bucket of buckets) {
    const result = await runAnalysisBatch(ai, bucket, profileDescription);
    partialResults.push(result);
  }

  if (partialResults.length === 1) {
    return partialResults[0];
  } else {
    // Merge partial results into a single comprehensive report
    return await runAnalysisBatch(ai, [], profileDescription, true, partialResults);
  }
}
