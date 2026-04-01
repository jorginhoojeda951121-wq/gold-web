/**
 * Rounds a number to the nearest integer.
 */
export const roundToNearestRupee = (amount: number): number => {
  return Math.round(amount);
};

/**
 * Rounds a number to 2 decimal places.
 */
export const roundToTwoDecimals = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

/**
 * Calculates GST amount.
 * @param baseAmount The amount before tax
 * @param taxRate The tax rate percentage (e.g., 3 for 3%)
 */
export const calculateGstAmount = (baseAmount: number, taxRate: number): number => {
  return roundToTwoDecimals(baseAmount * (taxRate / 100));
};

/**
 * Extracts base amount from a tax-inclusive total.
 * @param totalWithTax The total amount including tax
 * @param taxRate The tax rate percentage (e.g., 3 for 3%)
 */
export const extractBaseAmount = (totalWithTax: number, taxRate: number): number => {
  return roundToTwoDecimals(totalWithTax / (1 + taxRate / 100));
};

/**
 * Standard GST Rates for India Jewelry Business (2026)
 */
export const GST_RATES = {
  GOLD: 3, // 1.5% CGST + 1.5% SGST
  SILVER: 3,
  MAKING_CHARGES: 5, // 2.5% CGST + 2.5% SGST
  REPAIR: 5,
  IMITATION: 5,
  JOB_WORK: 5,
};

/**
 * Standard HSN Codes
 */
export const HSN_CODES = {
  GOLD_JEWELLERY: "7113",
  SILVER_JEWELLERY: "7113",
  GOLD_COINS: "7114",
  IMITATION_JEWELLERY: "7117",
  MAKING_CHARGES: "998859",
};

/**
 * Core Jewellery Billing Calculation
 */
export interface JewelleryCalculationResult {
  netWeight: number;
  goldValue: number;
  wastageAmount: number;
  taxableGoldValue: number;
  makingCharges: number;
  gstOnGold: number;
  gstOnMaking: number;
  totalGst: number;
  subTotal: number;
  grandTotal: number;
}

export const calculateJewelleryBill = (
  grossWeight: number,
  stoneWeight: number,
  ratePerGram: number,
  wastagePercentage: number = 0,
  makingChargeValue: number = 0,
  isMakingPercentage: boolean = false
): JewelleryCalculationResult => {
  const netWeight = roundToTwoDecimals(grossWeight - stoneWeight);
  const goldValue = roundToTwoDecimals(netWeight * ratePerGram);
  
  const wastageAmount = roundToTwoDecimals(goldValue * (wastagePercentage / 100));
  const taxableGoldValue = roundToTwoDecimals(goldValue + wastageAmount);
  
  let makingCharges = isMakingPercentage 
    ? roundToTwoDecimals(goldValue * (makingChargeValue / 100))
    : makingChargeValue;
  
  const gstOnGold = roundToTwoDecimals(taxableGoldValue * (GST_RATES.GOLD / 100));
  const gstOnMaking = roundToTwoDecimals(makingCharges * (GST_RATES.MAKING_CHARGES / 100));
  
  const totalGst = roundToTwoDecimals(gstOnGold + gstOnMaking);
  const subTotal = roundToTwoDecimals(taxableGoldValue + makingCharges);
  const grandTotal = roundToNearestRupee(subTotal + totalGst);
  
  return {
    netWeight,
    goldValue,
    wastageAmount,
    taxableGoldValue,
    makingCharges,
    gstOnGold,
    gstOnMaking,
    totalGst,
    subTotal,
    grandTotal
  };
};

/**
 * Old Gold Exchange Calculation
 */
export const calculateOldGoldExchange = (
  weight: number,
  rate: number,
  deductionPercentage: number = 0
) => {
  const baseValue = roundToTwoDecimals(weight * rate);
  const deductionAmount = roundToTwoDecimals(baseValue * (deductionPercentage / 100));
  const finalValue = roundToTwoDecimals(baseValue - deductionAmount);
  
  return {
    baseValue,
    deductionAmount,
    finalValue
  };
};

/**
 * Formats a number as Indian Currency (INR).
 */
export const formatInr = (amount: number): string => {
  const n = amount == null || Number.isNaN(amount) ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

/**
 * Formats a number as Indian Currency (INR) without symbol.
 */
export const formatAmount = (amount: number): string => {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
