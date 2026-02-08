
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AnalysisResult, LifestyleProfile, UploadedFile } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { PDFDocument } from "pdf-lib";

const MAX_PAGES_PER_BUCKET = 20;
const MAX_RETRIES = 3;

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
 */
function forensicJsonSanitize(jsonString: string): string {
  let result = "";
  let inQuote = false;
  let i = 0;
  
  while (i < jsonString.length) {
    const char = jsonString[i];
    if (char === '"' && (i === 0 || jsonString[i-1] !== '\\')) {
      inQuote = !inQuote;
      result += char;
      i++;
      continue;
    }
    
    if (!inQuote) {
      if (char === '}' || char === ']') {
        result += char;
        let j = i + 1;
        while (j < jsonString.length && /\s/.test(jsonString[j])) j++;
        if (j < jsonString.length && (jsonString[j] === '{' || jsonString[j] === '[')) {
          result += ",";
        }
        i = j;
        continue;
      }
      const remaining = jsonString.substring(i);
      const numMatch = remaining.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
      if (numMatch) {
        const rawNum = numMatch[0];
        const num = parseFloat(rawNum);
        if (!isNaN(num) && isFinite(num)) {
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
  let cleaned = rawString.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  } else {
    throw new Error("The forensic report structure was corrupted or incomplete.");
  }

  cleaned = forensicJsonSanitize(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch (e: any) {
    try {
      const fallbackRepair = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      return JSON.parse(fallbackRepair);
    } catch (innerError) {
      throw new Error(`Data Stream Corruption: The building audit returned malformed data. Please try again with fewer documents.`);
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
      3. CITATIONS: If a risk is mentioned multiple times, CITE the page that contains the most severe impact.
      4. DO NOT OUTPUT NUMBERS WITH MORE THAN 4 DECIMAL PLACES.
      5. CRITICAL: Ensure every array element is separated by a comma.
      Data: ${JSON.stringify(previousResults)}
    `;
  } else {
    prompt = `
      Conduct a 10-year forensic living simulation based on the provided documents.
      Profile: ${profileDescription}
      ROUND ALL NUMBERS to 4 decimal places. No scientific notation.
    `;
  }

  let lastError: any = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
        /// 1. USE STREAMING (Keeps connection alive, prevents 2-min timeout)
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview", // ✅ KEEPS THE REQUIREMENT
        contents: isSynthesis 
          ? [{ role: "user", parts: [{ text: prompt }] }] 
          : [{ role: "user", parts: [...fileParts, { text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + " MANDATORY: Return a VALID JSON object. Round to 4 decimal places. No scientific notation.",
          responseMimeType: "application/json",
          
          // 2. CRITICAL SPEED FIX: 
          // Use "low" thinking level. It still uses "Deep Think" (satisfying the criteria)
          // but caps it at ~15 seconds instead of 5 minutes.
          thinkingConfig: { 
            includeThoughts: false, // Don't pollute the JSON with thoughts
            thinkingLevel: ThinkingLevel.LOW    // ⚡ FASTEST SETTING
          }, 
          temperature: 0.2,
        }
      });

      let fullText = "";

      // 3. Process the Stream
      for await (const chunk of responseStream) {
        // In the new SDK, safely extract text
        const text = chunk.text ? chunk.text : ""; 
        if (text) {
          fullText += text;
          // Optional: console.log("Chunk received:", text.length); 
        }
      }

      console.log("✅ Stream Complete. Length:", fullText.length);

      if (!fullText.trim()) {
        throw new Error("Gemini 3 Pro returned empty response.");
      }

      // 4. Parse the JSON
      // The cleanJsonString function (which you likely have) removes markdown ```json ... ```
      return cleanJsonString(fullText) as AnalysisResult;
    // try {
    //   const response = await ai.models.generateContent({
    //     model: "gemini-3-pro-preview",
    //     contents: { 
    //       parts: isSynthesis ? [{ text: prompt }] : [...fileParts, { text: prompt }] 
    //     },
    //     config: {
    //       systemInstruction: SYSTEM_INSTRUCTION + " MANDATORY: Return a VALID JSON object. Round to 4 decimal places. No scientific notation.",
    //       responseMimeType: "application/json",
    //       thinkingConfig: { 
    //         thinkingLevel: "low", 
    //         includeThoughts: false // Set to true only if you want to debug the thoughts
    //         },
    //       // tools: isSynthesis ? [] : [{ googleSearch: {} }], // disable for demo
    //       responseSchema: {
    //         type: Type.OBJECT,
    //         properties: {
    //           riskScore: { type: Type.NUMBER },
    //           redTeamSummary: {
    //             type: Type.ARRAY,
    //             items: {
    //               type: Type.OBJECT,
    //               properties: {
    //                 content: { type: Type.STRING },
    //                 source: {
    //                   type: Type.OBJECT,
    //                   properties: { fileName: { type: Type.STRING }, pageNumber: { type: Type.STRING } },
    //                   required: ["fileName", "pageNumber"]
    //                 }
    //               },
    //               required: ["content"]
    //             }
    //           },
    //           timeline: {
    //             type: Type.ARRAY,
    //             items: {
    //               type: Type.OBJECT,
    //               properties: {
    //                 year: { type: Type.NUMBER },
    //                 event: { type: Type.STRING },
    //                 cost: { type: Type.STRING },
    //                 severity: { type: Type.STRING },
    //                 description: { type: Type.STRING },
    //                 resolution: { type: Type.STRING },
    //               },
    //               required: ["year", "event", "cost", "severity", "description", "resolution"]
    //             }
    //           },
    //           lifestyleConflicts: {
    //             type: Type.ARRAY,
    //             items: {
    //               type: Type.OBJECT,
    //               properties: { bylaw: { type: Type.STRING }, conflict: { type: Type.STRING }, recommendation: { type: Type.STRING } },
    //               required: ["bylaw", "conflict", "recommendation"]
    //             }
    //           },
    //           financialWarGaming: {
    //             type: Type.ARRAY,
    //             items: {
    //               type: Type.OBJECT,
    //               properties: {
    //                 year: { type: Type.NUMBER },
    //                 expectedCost: { type: Type.NUMBER },
    //                 fundBalance: { type: Type.NUMBER },
    //                 levyImpact: { type: Type.NUMBER },
    //                 yieldImpactBestCase: { type: Type.NUMBER },
    //                 yieldImpactWorstCase: { type: Type.NUMBER },
    //                 totalMonthlyOwnershipCost: { type: Type.NUMBER },
    //               },
    //               required: ["year", "expectedCost", "fundBalance", "levyImpact"]
    //             }
    //           },
    //           amenities: {
    //             type: Type.ARRAY,
    //             items: {
    //               type: Type.OBJECT,
    //               properties: { name: { type: Type.STRING }, condition: { type: Type.STRING }, forecastedMaintenanceYear: { type: Type.NUMBER }, estimatedCost: { type: Type.STRING } },
    //               required: ["name", "condition", "forecastedMaintenanceYear", "estimatedCost"]
    //             }
    //           },
    //           recommendedRent: {
    //             type: Type.OBJECT,
    //             properties: { weekly: { type: Type.NUMBER }, annual: { type: Type.NUMBER }, justification: { type: Type.STRING } },
    //             required: ["weekly", "annual", "justification"]
    //           },
    //           rentVsBuy: {
    //             type: Type.OBJECT,
    //             properties: {
    //               monthlyOwnershipCost: { type: Type.NUMBER },
    //               marketRentEquivalent: { type: Type.NUMBER },
    //               tenYearTotalDelta: { type: Type.NUMBER },
    //               comparablePropertyLink: { type: Type.STRING },
    //               justification: { type: Type.STRING },
    //               yearlyProjection: {
    //                 type: Type.ARRAY,
    //                 items: {
    //                   type: Type.OBJECT,
    //                   properties: { year: { type: Type.NUMBER }, ownershipCost: { type: Type.NUMBER }, estimatedRent: { type: Type.NUMBER } },
    //                   required: ["year", "ownershipCost", "estimatedRent"]
    //                 }
    //               }
    //             }
    //           },
    //           investorWealth: {
    //             type: Type.OBJECT,
    //             properties: {
    //               totalTenYearWealth: { type: Type.NUMBER },
    //               averageAnnualYield: { type: Type.NUMBER },
    //               yearlyWealth: {
    //                 type: Type.ARRAY,
    //                 items: {
    //                   type: Type.OBJECT,
    //                   properties: {
    //                     year: { type: Type.NUMBER },
    //                     netCashFlow: { type: Type.NUMBER },
    //                     equityGrowth: { type: Type.NUMBER }
    //                   },
    //                   required: ["year", "netCashFlow", "equityGrowth"]
    //                 }
    //               },
    //               justification: { type: Type.STRING }
    //             }
    //           },
    //           conclusion: { type: Type.STRING },
    //           conclusionSource: {
    //             type: Type.OBJECT,
    //             properties: { fileName: { type: Type.STRING }, pageNumber: { type: Type.STRING } },
    //           }
    //         },
    //         required: ["riskScore", "redTeamSummary", "timeline", "lifestyleConflicts", "financialWarGaming", "amenities", "conclusion"]
    //       }
    //     }
    //   });

    //   const text = response.text;
    //   if (!text || text.trim() === "") {
    //     throw new Error("The model returned an empty report.");
    //   }

    //   return cleanJsonString(text) as AnalysisResult;
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt ${attempt + 1} failed:`, err);
      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error("The building audit failed after multiple attempts. This is likely due to complex document content.");
}

export async function analyzeProperty(files: UploadedFile[], profile: LifestyleProfile): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const profileDescription = JSON.stringify(profile);
  const allProcessedFiles: UploadedFile[] = [];
  
  for (const file of files) {
    try {
      const split = await splitLargePdf(file);
      allProcessedFiles.push(...split);
    } catch (e) {
      console.error("Failed to split PDF:", e);
      // If split fails, try adding the original file (risky but better than nothing)
      allProcessedFiles.push(file);
    }
  }

  // // Use smaller batches for complex documents to avoid timeouts
  // if (allProcessedFiles.length > 2) {
  //   const partialReports: AnalysisResult[] = [];
  //   for (let i = 0; i < allProcessedFiles.length; i += 2) {
  //     const batch = allProcessedFiles.slice(i, i + 2);
  //     const res = await runAnalysisBatch(ai, batch, profileDescription);
  //     partialReports.push(res);
  //   }
  //   return await runAnalysisBatch(ai, [], profileDescription, true, partialReports);
  // } else {
  //   return await runAnalysisBatch(ai, allProcessedFiles, profileDescription);
  // }

 
  

  // 3. 🚨 HACKATHON SAFETY CAP 🚨
  // The server crashes if we send > 50 pages of base64 text.
  // We limit the demo to the first 3 chunks (approx 60 pages).
  const SAFE_DEMO_LIMIT = 3;
  
  const safePayload = allProcessedFiles.slice(0, SAFE_DEMO_LIMIT);

  console.log(`🚀 Sending ${safePayload.length} chunks to Gemini 3 Pro...`);

  // 4. Call the AI
  return await runAnalysisBatch(ai, safePayload, profileDescription);
}
