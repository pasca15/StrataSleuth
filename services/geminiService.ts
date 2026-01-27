
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
 * Advanced JSON forensic cleaner.
 * 1. Rounds "toxic" floats to 4 decimal places.
 * 2. Injects missing commas between adjacent objects/arrays (common LLM failure).
 * 3. Operates character-by-character to protect data inside strings.
 */
function forensicJsonSanitize(jsonString: string): string {
  let result = "";
  let inQuote = false;
  let i = 0;
  
  while (i < jsonString.length) {
    const char = jsonString[i];
    
    // Toggle inQuote state, respecting escaped quotes
    if (char === '"' && (i === 0 || jsonString[i-1] !== '\\')) {
      inQuote = !inQuote;
      result += char;
      i++;
      continue;
    }
    
    // Structural and numerical repairs happen ONLY outside of quotes
    if (!inQuote) {
      // 1. Repair missing commas between structural boundaries: } { or ] [ or ] { etc.
      if (char === '}' || char === ']') {
        result += char;
        let j = i + 1;
        // Skip whitespace
        while (j < jsonString.length && /\s/.test(jsonString[j])) j++;
        // If next non-white char is start of another object/array, inject a comma
        if (j < jsonString.length && (jsonString[j] === '{' || jsonString[j] === '[')) {
          result += ",";
        }
        i = j;
        continue;
      }

      // 2. Locate and round high-precision numerical values
      const remaining = jsonString.substring(i);
      const numMatch = remaining.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
      
      if (numMatch) {
        const rawNum = numMatch[0];
        const num = parseFloat(rawNum);
        
        if (!isNaN(num) && isFinite(num)) {
          // Force 4 decimal places to prevent parser overflow or scientific notation hallucinations
          result += (Math.round(num * 10000) / 10000).toString();
        } else {
          result += "0";
        }
        
        i += rawNum.length;
        continue;
      }
    }
    
    result += char;
    i++;
  }
  
  return result;
}

function cleanJsonString(rawString: string): any {
  // 1. Extract JSON block
  let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  } else {
    throw new Error("The forensic report was incomplete or missing valid data structures.");
  }

  // 2. Perform forensic sanitization (Numerical rounding + Structural repair)
  cleaned = forensicJsonSanitize(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error("Forensic JSON parse failed:", e);
    
    // Last-ditch heuristic repair for trailing commas or common syntax breaks
    try {
      const fallbackRepair = cleaned
        .replace(/,\s*([\]}])/g, '$1') // Trailing commas
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // Unquoted keys
      
      return JSON.parse(fallbackRepair);
    } catch (innerError) {
      const errorContext = e.message || "Unknown Syntax Error";
      throw new Error(`Forensic Audit Interrupted: The data stream was corrupted (${errorContext}). Please try a smaller document batch.`);
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
      chunks.push({ ...file, name: `${file.name} (Part ${Math.floor(i/MAX_PAGES_PER_BUCKET) + 1})`, base64 });
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
      SYNTHESIS TASK: Merge the following partial reports into one final, cohesive 10-year forensic living simulation.
      1. Aggregate all 'redTeamSummary' entries without duplicates.
      2. Construct a unified 'timeline' for exactly 10 years (e.g. 2026-2035).
      3. For 'financialWarGaming', ensure 'yieldImpactBestCase' and 'yieldImpactWorstCase' are provided for 5 years (2026-2030).
      4. CITATIONS: If a risk (like a Fire Safety Order) is mentioned multiple times, CITE the page that contains the most severe impact or definitive evidence.
      5. DO NOT OUTPUT NUMBERS WITH MORE THAN 4 DECIMAL PLACES.
      6. CRITICAL: Ensure every array element is separated by a comma.
      Data: ${JSON.stringify(previousResults)}
    `;
  } else {
    prompt = `
      Conduct a 10-year forensic living simulation based on the provided documents.
      Profile: ${profileDescription}

      YIELD EROSION FORECAST (Next 5 Years ONLY):
      Generate two distinct net rental yield scenarios for the years 2026, 2027, 2028, 2029, 2030:
      - yieldImpactBestCase: Optimized net yield scenario.
      - yieldImpactWorstCase: realistic "Nightmare" net yield scenario (accounting for special levies/maintenance found in minutes).

      IMPORTANT RULES:
      - CITATIONS: If a risk (like a Fire Safety Order) is mentioned multiple times in the documents, CITE the page that contains the most severe impact or definitive evidence in your 'redTeamSummary'.
      - Return 10 years for 'financialWarGaming'. Only the first 5 entries should include yieldImpact fields.
      - ROUND ALL NUMBERS to 4 decimal places. No long floats. No scientific notation.
      - ENSURE COMMAS separate all objects in arrays.
    `;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { 
      parts: isSynthesis ? [{ text: prompt }] : [...fileParts, { text: prompt }] 
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + " MANDATORY: Return a VALID JSON object. All numeric values must be rounded to 4 decimal places. No scientific notation. Ensure all array elements are comma-separated.",
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 15000 },
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
          conclusion: { type: Type.STRING },
          conclusionSource: {
            type: Type.OBJECT,
            properties: { fileName: { type: Type.STRING }, pageNumber: { type: Type.STRING } },
          }
        },
        required: ["riskScore", "redTeamSummary", "timeline", "lifestyleConflicts", "financialWarGaming", "amenities", "conclusion"]
      }
    }
  });

  const text = response.text;
  if (!text || text.trim() === "") {
    throw new Error("Empty response from building audit. The model may have timed out or hit complexity limits.");
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
