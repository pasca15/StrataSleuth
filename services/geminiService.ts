
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
 * Improved JSON cleaning to handle trailing commas, markdown artifacts,
 * and extremely long floating point numbers that break parsers.
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

  // Fix extremely long floats (e.g., 0.0571176470588235340799999...)
  // This regex looks for numbers with more than 10 decimal places and truncates to 4.
  cleaned = cleaned.replace(/(\d+\.\d{4})\d+/g, '$1');

  // Remove trailing commas in arrays and objects: [1, 2, ] -> [1, 2] or {a:1, } -> {a:1}
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  return cleaned;
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

// Fix: Completed the runAnalysisBatch function to properly execute the Gemini API request and return the AnalysisResult.
async function runAnalysisBatch(
  ai: GoogleGenAI,
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
      Merge these partial reports into one final, cohesive 10-year forensic living simulation.
      
      CRITICAL INSTRUCTIONS:
      1. Aggregate 'redTeamSummary' ensuring NO DUPLICATES and accurate source citations.
      2. Construct a UNIFIED 'timeline' representing exactly 10 years.
      3. Average the 'financialWarGaming' values for each year.
      4. ROUND ALL NUMBERS TO 4 DECIMAL PLACES MAXIMUM.
      
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
      IMPORTANT: Round all float/decimal values to exactly 4 decimal places.
    `;
  }

  // Use gemini-3-pro-preview for complex reasoning and search integration.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { 
      parts: isSynthesis ? [{ text: prompt }] : [...fileParts, { text: prompt }] 
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 12000 },
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
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("The AI agent failed to return analysis data. Please try again.");

  try {
    return JSON.parse(cleanJsonString(text)) as AnalysisResult;
  } catch (e) {
    console.error("JSON Parse Error:", e, "Response Text:", text);
    throw new Error("The property report could not be formatted correctly. Try splitting your documents.");
  }
}

// Fix: Exported analyzeProperty to fix the module export error in App.tsx.
export async function analyzeProperty(
  files: UploadedFile[],
  profile: LifestyleProfile
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const profileDescription = JSON.stringify(profile);

  // 1. Process files into buckets to stay within context limits
  let allFileChunks: UploadedFile[] = [];
  for (const file of files) {
    const split = await splitLargePdf(file);
    allFileChunks.push(...split);
  }

  // 2. Batch the processing (approx 2 chunks per request to be safe with token limits)
  const batches: UploadedFile[][] = [];
  for (let i = 0; i < allFileChunks.length; i += 2) {
    batches.push(allFileChunks.slice(i, i + 2));
  }

  const batchResults: AnalysisResult[] = [];
  for (const batch of batches) {
    const result = await runAnalysisBatch(ai, batch, profileDescription);
    batchResults.push(result);
  }

  if (batchResults.length === 0) {
    throw new Error("No analysis data could be retrieved from the documents.");
  }

  // 3. If there are multiple batches, perform a final synthesis step
  if (batchResults.length === 1) {
    return batchResults[0];
  }

  return await runAnalysisBatch(ai, [], profileDescription, true, batchResults);
}
