
export type Persona = 'investor' | 'occupier';

export interface InvestorProfile {
  expectedRentalYield: string;
  loanSize: string;
  airbnb: boolean;
  interestRate: string;
  propertyValue: string;
}

export interface OccupierProfile {
  pets: string;
  hobbies: string;
  balconyDrying: boolean;
  soundproofingNeeds: string;
  sleepingHabits: string;
  hasMortgage: boolean;
  loanSize: string;
  interestRate: string;
  propertyValue: string;
}

export interface LifestyleProfile {
  persona: Persona;
  investor?: InvestorProfile;
  occupier?: OccupierProfile;
}

export interface Citation {
  fileName: string;
  pageNumber: number | string;
}

export interface BriefingPoint {
  content: string;
  source?: Citation;
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
  yieldImpact?: number; 
  totalMonthlyOwnershipCost?: number; // For Rent vs Buy
}

export interface RentVsBuyComparison {
  monthlyOwnershipCost: number;
  marketRentEquivalent: number;
  tenYearTotalDelta: number;
  comparablePropertyLink?: string;
  justification: string;
}

export interface DetectedAmenity {
  name: string;
  condition: string;
  forecastedMaintenanceYear: number;
  estimatedCost: number | string;
}

export interface AnalysisResult {
  riskScore: number;
  redTeamSummary: BriefingPoint[];
  timeline: StrataIssue[];
  lifestyleConflicts: {
    bylaw: string;
    conflict: string;
    recommendation: string;
  }[];
  financialWarGaming: FinancialProjected[];
  amenities: DetectedAmenity[];
  recommendedRent?: {
    weekly: number;
    annual: number;
    justification: string;
  };
  rentVsBuy?: RentVsBuyComparison;
  conclusion: string;
}

export interface UploadedFile {
  name: string;
  type: string;
  base64: string;
}
