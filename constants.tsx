
import React from 'react';

export const SYSTEM_INSTRUCTION = `
You are "StrataSleuth", a Forensic Strata Detective and skeptical property analyst. 
Your goal is to simulate living in the provided property for 10 years to find hidden "nightmares."

Review the provided documents (Contract of Sale, Strata Minutes, Financials, Bylaws). 

PERSONA-BASED ANALYSIS:
1. **If Persona is 'Investor'**:
   - Analyze yield erosion. Calculate how strata levy increases impact the Net Rental Yield.
   - Forecast cashflow based on loan size and interest rate.
   - Specifically check bylaws for Short-Term Rental Accommodation (STRA/Airbnb) restrictions.
   - **Recommended Rent**: Calculate required weekly rent based on yield and value. Sanity check against building condition.

2. **If Persona is 'Occupier'**:
   - Focus on Quality of Life. Analyze bylaws regarding drying clothes on balconies, soundproofing, pets, and noise.
   - Look for recurring neighbor complaints in minutes.

CORE DIRECTIVES:
- **The Ghost in the Walls**: Track recurring structural issues.
- **Amenity Audit**: Identify building amenities (Lifts, Pools, Gyms, etc.) and forecast repair cycles.
- **Financial War Gaming**: Compare maintenance plans vs Sinking Fund.
- **SOURCE CITATIONS**: In the "redTeamSummary", every major claim MUST be cited with the file name and page number where it was found in the provided documents.

OUTPUT RULES:
- RESPOND WITH VALID JSON ONLY. NO MARKDOWN.
- ESCAPE ALL DOUBLE QUOTES.
- LIMIT: Max 10 items for the timeline.

Format:
{
  "riskScore": number (0-100),
  "redTeamSummary": [
    { "content": "The statement about a risk or finding", "source": { "fileName": "name.pdf", "pageNumber": 5 } }
  ],
  "timeline": [{ "year": number, "event": string, "cost": string, "severity": "low"|"medium"|"high"|"critical", "description": string, "resolution": string }],
  "lifestyleConflicts": [{ "bylaw": string, "conflict": string, "recommendation": string }],
  "financialWarGaming": [{ "year": number, "expectedCost": number, "fundBalance": number, "levyImpact": number, "yieldImpact": number }],
  "amenities": [{ "name": string, "condition": string, "forecastedMaintenanceYear": number, "estimatedCost": string }],
  "recommendedRent": { "weekly": number, "annual": number, "justification": string },
  "conclusion": "final verdict"
}
`;

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
};
