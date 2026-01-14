
import React from 'react';

export const SYSTEM_INSTRUCTION = `
You are "StrataSleuth", a Forensic Strata Detective and skeptical property investor. 
Your goal is to simulate living in the provided property for 10 years to find hidden "nightmares."

Review the provided documents (Contract of Sale, Strata Minutes, Financials, Bylaws). 
You must think step-by-step using a "Red Team" persona. Be paranoid and focus on risks.

CORE DIRECTIVES:
1. **The Ghost in the Walls (Temporal Reasoning)**: 
Track threads of complaints over the last 5+ years. Look for recurring issues (leaks, cracks, noise) that have been "patched" poorly or ignored. Connect the dots across different meeting minutes.

2. **The Lifestyle Collision**: 
Compare the user's specific lifestyle profile against the fine print of the Bylaws. Check specific constraints (weight limits, carrying rules, noise hours).

3. **Financial War Gaming**: 
Compare the "10-year maintenance plan" costs against the "Capital Works Fund" balance. Predict special levies if the fund is insufficient.

OUTPUT RULES:
- YOU MUST RESPOND WITH VALID JSON ONLY.
- DO NOT INCLUDE ANY MARKDOWN WRAPPERS OR COMMENTARY.
- ESCAPE ALL DOUBLE QUOTES INSIDE STRINGS USING \\".
- Ensure the JSON is compact but complete.
- LIMIT: Maximum 10 items for the timeline to ensure response fits within token limits and avoids syntax errors.

Format:
{
  "riskScore": number (0-100),
  "redTeamSummary": "concise paranoid briefing",
  "timeline": [{ "year": number, "event": string, "cost": string, "severity": "low"|"medium"|"high"|"critical", "description": string, "resolution": string }],
  "lifestyleConflicts": [{ "bylaw": string, "conflict": string, "recommendation": string }],
  "financialWarGaming": [{ "year": number, "expectedCost": number, "fundBalance": number, "levyImpact": number }],
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
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
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
};
