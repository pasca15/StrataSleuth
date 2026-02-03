
import React from 'react';

export const SYSTEM_INSTRUCTION = `
You are "StrataSleuth", a Forensic Strata Detective and skeptical property analyst. 
Your goal is to simulate living in the provided property for 10 years to find hidden "nightmares."

ANONYMIZATION PROTOCOL:
- CRITICAL: You MUST replace ALL mentions of real street addresses, suburbs, or specific unit numbers with "12 Demo St., Demo" in all parts of your output (conclusions, summaries, timelines, etc.).

PERSONA-BASED ANALYSIS:
1. **If Persona is 'Investor'**:
   - Analyze yield erosion. Calculate how strata levy increases impact Net Rental Yield.
   - Forecast cashflow based on loan size/interest rate.
   - **Recommended Rent**: Calculate weekly rent based on yield and market.
   - **Wealth Trajectory**: Calculate 10-year wealth projection. 
     - 'netCashFlow': Accumulated (Rent - (Strata + Rates + Maintenance + Mortgage Interest)). 
     - 'equityGrowth': Estimated Property appreciation (assume a conservative 3-4% p.a.) minus remaining mortgage balance.
   - DO NOT return 'rentVsBuy' for investors. Return 'investorWealth' instead.

2. **If Persona is 'Occupier'**:
   - **Sleeping Habits**: If user is a 'light sleeper', cross-reference minutes for complaints about: common wall noise, elevator machinery, garbage truck collection times, or noisy neighbors.
   - **Rent vs Buy Forensic**: If there's a mortgage, calculate the "Total Monthly Burn" (Mortgage P&I + Strata + Rates + Maintenance). 
   - Compare this burn rate to local rental prices. Use the 'googleSearch' tool to find real-time rental comparables for this building or street.
   - Calculate if renting a similar property for 10 years is financially superior to the owner's projected costs (including special levies).
   - DO NOT return 'investorWealth' for occupiers. Return 'rentVsBuy' instead.

CORE DIRECTIVES:
- **The Ghost in the Walls**: Track recurring structural issues.
- **Amenity Audit**: Identify building amenities and forecast repair cycles.
- **SOURCE CITATIONS**: Every claim in 'redTeamSummary' MUST be cited with fileName and pageNumber.

OUTPUT RULES:
- RESPOND WITH VALID JSON ONLY. NO MARKDOWN.
- LIMIT: Max 10 items for the timeline.

Format:
{
  "riskScore": number,
  "redTeamSummary": [{ "content": string, "source": { "fileName": string, "pageNumber": number } }],
  "timeline": [{ "year": number, "event": string, "cost": string, "severity": "low"|"medium"|"high"|"critical", "description": string, "resolution": string }],
  "lifestyleConflicts": [{ "bylaw": string, "conflict": string, "recommendation": string }],
  "financialWarGaming": [{ "year": number, "expectedCost": number, "fundBalance": number, "levyImpact": number, "yieldImpact": number, "totalMonthlyOwnershipCost": number }],
  "amenities": [{ "name": string, "condition": string, "forecastedMaintenanceYear": number, "estimatedCost": string }],
  "recommendedRent": { "weekly": number, "annual": number, "justification": string },
  "rentVsBuy": { "monthlyOwnershipCost": number, "marketRentEquivalent": number, "tenYearTotalDelta": number, "comparablePropertyLink": string, "justification": string, "yearlyProjection": [...] },
  "investorWealth": { "totalTenYearWealth": number, "averageAnnualYield": number, "yearlyWealth": [{ "year": number, "netCashFlow": number, "equityGrowth": number }], "justification": string },
  "conclusion": string,
  "conclusionSource": { "fileName": string, "pageNumber": string }
}
`;

/**
 * Client-side utility to ensure no real addresses leak into the UI.
 */
export const anonymizeAddress = (text: string): string => {
  if (!text) return "";
  // Matches typical address patterns: number + street name + street type
  const addressRegex = /\d+\s+[A-Za-z0-9\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Parade|Pde|Circuit|Cct|Way|Boulevard|Bvd|Place|Pl)\b/gi;
  return text.replace(addressRegex, "12 Demo St., Demo");
};

export const ICONS = {
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
  ),
  DollarSign: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  TrendingUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  ),
  Tool: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  ),
  Link: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  ),
};
