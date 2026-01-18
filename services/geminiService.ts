
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
  
  const fileParts = files.map(file => ({
    inlineData: {
      data: file.base64,
      mimeType: file.type || "application/pdf"
    }
  }));

  let profileDescription = "";
  if (lifestyle.persona === 'investor' && lifestyle.investor) {
    profileDescription = `
      Persona: Investor
      Property Purchase Price: $${lifestyle.investor.propertyValue}
      Expected Yield: ${lifestyle.investor.expectedRentalYield}%
      Loan Size: $${lifestyle.investor.loanSize}
      Interest Rate: ${lifestyle.investor.interestRate}%
      Airbnb usage planned: ${lifestyle.investor.airbnb}
    `;
  } else if (lifestyle.persona === 'occupier' && lifestyle.occupier) {
    profileDescription = `
      Persona: Owner/Occupier
      Pets: ${lifestyle.occupier.pets}
      Hobbies: ${lifestyle.occupier.hobbies}
      Sleeping Habits/Sensitivity: ${lifestyle.occupier.sleepingHabits}
      Drying clothes on balcony: ${lifestyle.occupier.balconyDrying}
      Soundproofing needs: ${lifestyle.occupier.soundproofingNeeds}
      Mortgage Info: ${lifestyle.occupier.hasMortgage ? `Loan $${lifestyle.occupier.loanSize} at ${lifestyle.occupier.interestRate}% for $${lifestyle.occupier.propertyValue} value` : 'No mortgage'}
    `;
  }

  const prompt = `
    Analyze these documents for a 10-year forensic simulation.
    Profile: ${profileDescription}

    Use Google Search to find current rental market data for the address or suburb mentioned in these files.
    If Persona is Occupier and they have a mortgage, generate a 10-year "Rent vs Buy" yearly projection. 
    Compare Total Cost of Ownership (Mortgage interest, Strata, Rates, Maintenance) vs renting a comparable property.
    
    If Persona is Occupier, also evaluate how noise/strata issues specifically affect their 'Sleeping Habits' (e.g. identify sources of early morning or late night noise in minutes).
    
    Respond strictly in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts: [...fileParts, { text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16000 },
        tools: [{ googleSearch: {} }],
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

    let resultText = response.text || "{}";
    return JSON.parse(resultText) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
