export interface LoanRow {
  readonly month: number;
  readonly payment: number;
  readonly principal: number;
  readonly interest: number;
  /** Balance left after this payment. */
  readonly balance: number;
}

export interface LoanSummary {
  readonly payment: number;
  readonly totalInterest: number;
  readonly totalPaid: number;
  /** Monthly effective rate (TEM). */
  readonly monthlyRate: number;
  readonly rows: readonly LoanRow[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Annual effective rate (TEA) → monthly effective rate (TEM). */
export function monthlyRateFromAnnual(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/** Fixed installment of the French amortization system. */
export function fixedPayment(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

/**
 * Full schedule in cents. The last installment absorbs rounding so the balance ends at exactly 0.
 */
export function amortize(principal: number, annualRate: number, months: number): LoanSummary {
  const rate = monthlyRateFromAnnual(annualRate);
  const payment = round2(fixedPayment(principal, rate, months));
  const rows: LoanRow[] = [];
  let balance = principal;

  for (let month = 1; month <= months; month++) {
    const interest = round2(balance * rate);
    const isLast = month === months;
    const principalPart = isLast ? round2(balance) : round2(payment - interest);
    balance = round2(balance - principalPart);
    rows.push({ month, payment: round2(principalPart + interest), principal: principalPart, interest, balance });
  }

  const totalInterest = round2(rows.reduce((sum, r) => sum + r.interest, 0));
  return { payment, totalInterest, totalPaid: round2(principal + totalInterest), monthlyRate: rate, rows };
}

/** Annual rate offered at a given level: better levels get cheaper credit, with a floor. */
export function annualRateForLevel(level: number): number {
  return Math.max(0.18, 0.32 - 0.005 * (level - 1));
}
