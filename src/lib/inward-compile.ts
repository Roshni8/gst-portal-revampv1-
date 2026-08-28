export type ComplianceProfile = {
  supplier_gstin: string;
  legal_name: string;
  trade_name: string | null;
  state_code: string;
  gstin_status: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "PROVISIONAL";
  filing_frequency: "MONTHLY" | "QUARTERLY";
  is_bank_validated: boolean;
  is_e_way_bill_blocked: boolean;
  last_gstr1_filed_period: string | null;
  last_gstr3b_filed_period: string | null;
};

export type Diagnostic = {
  severity: "INFO" | "WARNING" | "CRITICAL";
  diagnostic_code: string;
  system_remark: string;
  action_recommendation: string;
  credit_at_risk_flag: boolean;
};

export function diagnoseSupplier(profile: ComplianceProfile): Diagnostic {
  if (profile.gstin_status === "SUSPENDED") return { severity: "CRITICAL", diagnostic_code: "WARN_SUSPENDED", system_remark: "CRITICAL: Supplier GSTIN is suspended by the tax department.", action_recommendation: "Hold payment and mark related bills for review in IMS before claiming ITC.", credit_at_risk_flag: true };
  if (profile.gstin_status === "CANCELLED") return { severity: "CRITICAL", diagnostic_code: "WARN_CANCELLED", system_remark: "CRITICAL: Supplier GSTIN has been cancelled.", action_recommendation: "Verify invoice date against cancellation date and hold ITC until supplier status is resolved.", credit_at_risk_flag: true };
  if (!profile.is_bank_validated) return { severity: "CRITICAL", diagnostic_code: "WARN_BANK_UNVALIDATED", system_remark: "CRITICAL: Supplier bank account is not validated under Rule 10A.", action_recommendation: "Obtain a validated bank-account confirmation before releasing payment or claiming ITC.", credit_at_risk_flag: true };
  if (profile.is_e_way_bill_blocked) return { severity: "CRITICAL", diagnostic_code: "WARN_EWAY_BLOCKED", system_remark: "CRITICAL: Supplier is blocked from generating e-way bills under Rule 138E.", action_recommendation: "Hold affected inward bills and request evidence that filing defaults have been cured.", credit_at_risk_flag: true };
  if (profile.gstin_status === "PROVISIONAL") return { severity: "WARNING", diagnostic_code: "WARN_PROVISIONAL", system_remark: "Supplier registration is provisional and requires additional monitoring.", action_recommendation: "Verify registration particulars before claiming ITC.", credit_at_risk_flag: false };
  if (profile.filing_frequency === "QUARTERLY") return { severity: "WARNING", diagnostic_code: "INFO_QRMP_FILER", system_remark: "Supplier is a Quarterly (QRMP) filer. Invoices may populate in GSTR-2B at quarter-end.", action_recommendation: "Hold for quarterly 2B auto-match; do not raise missing-invoice disputes during M1/M2.", credit_at_risk_flag: false };
  return { severity: "INFO", diagnostic_code: "OK_ACTIVE_MONTHLY", system_remark: "Supplier is active, a monthly filer, and bank validated. No compliance blockers detected.", action_recommendation: "Proceed with invoice processing and ITC claim.", credit_at_risk_flag: false };
}
