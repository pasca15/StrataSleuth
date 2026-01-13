
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LifestyleProfile, UploadedFile } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export async function analyzeProperty(
  files: UploadedFile[],
  lifestyle: LifestyleProfile
): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  // Convert our files to Gemini parts
  const fileParts = files.map(file => ({
    inlineData: {
      data: file.base64,
      mimeType: file.type || "application/pdf"
    }
  }));

  const prompt = `
    Analyze the attached strata documents for this user lifestyle:
    - Pets: ${lifestyle.pets}
    - Hobbies/Noise: ${lifestyle.hobbies}
    - Usage (e.g. Airbnb): ${lifestyle.usage}

    Perform a 10-year forensic simulation. 
    Respond strictly in JSON format as defined in your system instructions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            ...fileParts,
            { text: prompt }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // No schema needed if we trust the prompt, but we can define one for safety.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            redTeamSummary: { type: Type.STRING },
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
                }
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
                }
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
                }
              }
            },
            conclusion: { type: Type.STRING }
          },
          required: ["riskScore", "redTeamSummary", "timeline", "lifestyleConflicts", "financialWarGaming", "conclusion"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    
    return JSON.parse(resultText) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
