
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

    Perform a 10-year forensic simulation. Focus on the most significant "nightmares" and financial risks.
    Respond strictly in JSON format. Do not include any markdown formatting or prefix/suffix.
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
        thinkingConfig: { thinkingBudget: 16000 },
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
                },
                required: ["year", "expectedCost", "fundBalance", "levyImpact"]
              }
            },
            conclusion: { type: Type.STRING }
          },
          required: ["riskScore", "redTeamSummary", "timeline", "lifestyleConflicts", "financialWarGaming", "conclusion"]
        }
      }
    });

    let resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    
    // Sometimes the model might wrap response in markdown even with responseMimeType
    // or include weird control characters if the output is huge.
    resultText = resultText.trim();
    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    try {
      return JSON.parse(resultText) as AnalysisResult;
    } catch (parseError) {
      console.error("Original JSON Text:", resultText);
      console.error("JSON Parse Error details:", parseError);
      throw new Error(`Failed to parse analysis report. The data might be too large or malformed. (Position: ${(parseError as any).at || 'unknown'})`);
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
