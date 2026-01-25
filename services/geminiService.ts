
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LifestyleProfile, UploadedFile } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { PDFDocument } from "pdf-lib";

const MAX_PAGES_PER_BUCKET = 250;

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Aggressive numerical cleaner to prevent JSON parsing errors.
 * Rounds all numbers to 4 decimal places and eliminates extreme scientific notation.
 */
function cleanJsonNumerical(jsonString: string): string {
  // Regex to match integers, floats, and scientific notation
  const numberRegex = /-?\d+\.?\d*([eE][+-]?\d+)?/g;
  return jsonString.replace(numberRegex, (match) => {
    const num = parseFloat(match);
    // If it's not a valid finite number or is ridiculously small/large, return "0"
    if (!isFinite(num) || Math.abs(num) < 1e-15 && num !== 0) return "0";
    // Return rounded to 4 decimal places, removing trailing zeros
    return parseFloat(num.toFixed(4)).toString();
  });
}

function cleanJsonString(rawString: string): any {
  let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "").trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Clean numerical values before parsing to avoid "Expected ',' or ']'" errors
  cleaned = cleanJsonNumerical(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse failed after sanitization:", e);
    // Attempt to fix common missing comma/bracket issues as a last resort
    try {
        // Simple heuristic for trailing commas or missing closing braces
        const repaired = cleaned.replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(repaired);
    } catch (innerError) {
        throw new Error("Critical parsing failure. The data structure returned by the AI was malformed and could not be repaired.");
    }
  }
}

async function splitLargePdf(file: UploadedFile): Promise<UploadedFile[]> {
  if (file.type !== "application/pdf") return [file];
  try {
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
      chunks.push({ ...file, name: `${file.name} (Pages ${i + 1}-${end})`, base64 });
    }
    return chunks;
  } catch (err) {
    return [file];
  }
}

async function runAnalysisBatch(
  ai: GoogleGenAI,
  files: UploadedFile[],
  profileDescription: string,
  isSynthesis: boolean = false,
  previousResults: AnalysisResult[] = []
): Promise<AnalysisResult> {
  const fileParts = files.map(file => ({
    inlineData: { data: file.base64, mimeType: file.type || "application/pdf" }
  }));

  let prompt = "";
  if (isSynthesis) {
    prompt = `
      SYNTHESIS TASK: Merge these partial reports into one final, cohesive 10-year forensic living simulation.
      1. Aggregate 'redTeamSummary' without duplicates.
      2. Construct a UNIFIED 'timeline' for 10 years.
      3. CRITICAL: For 'financialWarGaming', provide exactly 5 years of 'yieldImpactBestCase' and 'yieldImpactWorstCase' (2026-2030).
      4. DO NOT OUTPUT NUMBERS WITH MORE THAN 4 DECIMAL PLACES. 
      5. Ensure 'rentVsBuy' is synthesized accurately.
      Data: ${JSON.stringify(previousResults)}
    `;
  } else {
    prompt = `
      Conduct a 10-year forensic living simulation based on the provided documents.
      Profile: ${profileDescription}

      YIELD EROSION FORECAST (Next 5 Years):
      Generate two distinct scenarios for the years 2026, 2027, 2028, 2029, 2030:
      - yieldImpactBestCase: Optimistic scenario with minimal special levies and standard maintenance.
      - yieldImpactWorstCase: Realistic "Nightmare" scenario where major identified defects (like waterproofing/cladding) result in significant special levies.

      IMPORTANT RULES: 
      - Return exactly 10 years of data in 'financialWarGaming' (e.g. 2026-2035). 
      - Popuate 'yieldImpactBestCase' and 'yieldImpactWorstCase' ONLY for the first 5 years.
      - ROUND ALL NUMBERS to 4 decimal places. No long floats. No scientific notation.
    `;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { 
      parts: isSynthesis ? [{ text: prompt }] : [...fileParts, { text: prompt }] 
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + " MANDATORY: All numeric values in the JSON output MUST be rounded to 4 decimal places. Do not output more than 4 digits after a decimal point.",
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
                  properties: { fileName: { type: Type.STRING }, pageNumber: { type: Type.STRING } },
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
              properties: { bylaw: { type: Type.STRING }, conflict: { type: Type.STRING }, recommendation: { type: Type.STRING } },
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
                yieldImpactBestCase: { type: Type.NUMBER },
                yieldImpactWorstCase: { type: Type.NUMBER },
                totalMonthlyOwnershipCost: { type: Type.NUMBER },
              },
              required: ["year", "expectedCost", "fundBalance", "levyImpact"]
            }
          },
          amenities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, condition: { type: Type.STRING }, forecastedMaintenanceYear: { type: Type.NUMBER }, estimatedCost: { type: Type.STRING } },
              required: ["name", "condition", "forecastedMaintenanceYear", "estimatedCost"]
            }
          },
          recommendedRent: {
            type: Type.OBJECT,
            properties: { weekly: { type: Type.NUMBER }, annual: { type: Type.NUMBER }, justification: { type: Type.STRING } },
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
                  properties: { year: { type: Type.NUMBER }, ownershipCost: { type: Type.NUMBER }, estimatedRent: { type: Type.NUMBER } },
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

  const text = response.text;
  if (!text || text.trim() === "") {
    throw new Error("The AI returned an empty response. This may be due to safety filters or a temporary model timeout.");
  }

  return cleanJsonString(text) as AnalysisResult;
}

export async function analyzeProperty(files: UploadedFile[], profile: LifestyleProfile): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const profileDescription = JSON.stringify(profile);
  const allProcessedFiles: UploadedFile[] = [];
  for (const file of files) {
    const split = await splitLargePdf(file);
    allProcessedFiles.push(...split);
  }

  if (allProcessedFiles.length > 2) {
    const partialReports: AnalysisResult[] = [];
    // Process in pairs to maintain context without overloading token limits
    for (let i = 0; i < allProcessedFiles.length; i += 2) {
      const batch = allProcessedFiles.slice(i, i + 2);
      const res = await runAnalysisBatch(ai, batch, profileDescription);
      partialReports.push(res);
    }
    return await runAnalysisBatch(ai, [], profileDescription, true, partialReports);
  } else {
    return await runAnalysisBatch(ai, allProcessedFiles, profileDescription);
  }
}
