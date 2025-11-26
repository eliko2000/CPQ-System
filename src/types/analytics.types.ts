// Analytics Types - Quotation statistics and analytics

// ============ Quotation Statistics ============
export interface QuotationStatistics {
  // Cost breakdown percentages
  hardwarePercent: number;
  softwarePercent: number;
  laborPercent: number;

  // Labor breakdown percentages
  engineeringPercent: number;
  commissioningPercent: number;

  // Material vs Labor ratio
  materialPercent: number; // (Hardware + Software) / Total
  laborOnlyPercent: number; // Labor / Total

  // Key ratios (formatted strings like "45:29:14")
  hwEngineeringCommissioningRatio: string; // "HW%:Eng%:Comm%"

  // Robot-specific analysis (if applicable)
  robotComponents?: {
    totalCostILS: number;
    percentOfTotal: number;
    count: number;
  };

  // Component counts
  componentCounts: {
    hardware: number;
    software: number;
    labor: number;
    total: number;
  };

  // Profit by type
  profitByType: {
    hardware: { profit: number; margin: number };
    software: { profit: number; margin: number };
    labor: { profit: number; margin: number };
  };
}
