
export interface LifestyleProfile {
  pets: string;
  hobbies: string;
  usage: string;
}

export interface StrataIssue {
  year: number;
  event: string;
  cost: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution: string;
}

export interface FinancialProjected {
  year: number;
  expectedCost: number;
  fundBalance: number;
  levyImpact: number;
}

export interface AnalysisResult {
  riskScore: number;
  redTeamSummary: string;
  timeline: StrataIssue[];
  lifestyleConflicts: {
    bylaw: string;
    conflict: string;
    recommendation: string;
  }[];
  financialWarGaming: FinancialProjected[];
  conclusion: string;
}

export interface UploadedFile {
  name: string;
  type: string;
  base64: string;
}
