import { amortize, annualRateForLevel, fixedPayment, monthlyRateFromAnnual } from './loan';
import { cashbackFor, progressFor } from './progression';
import { formatMoney } from '../../../shared/ui/money';

describe('loan math', () => {
  it('converts an annual effective rate into its monthly equivalent', () => {
    expect(monthlyRateFromAnnual(Math.pow(1.01, 12) - 1)).toBeCloseTo(0.01, 10);
  });

  it('matches the textbook French installment', () => {
    // S/ 1,000 at 1% monthly for 12 months → S/ 88.85
    expect(fixedPayment(1000, 0.01, 12)).toBeCloseTo(88.85, 2);
    expect(fixedPayment(1200, 0, 12)).toBe(100);
  });

  it('builds a schedule that pays off the loan exactly', () => {
    const loan = amortize(10_000, 0.265, 24);
    const last = loan.rows.at(-1)!;

    expect(loan.rows).toHaveLength(24);
    expect(last.balance).toBe(0);
    const principalPaid = loan.rows.reduce((sum, r) => sum + r.principal, 0);
    expect(principalPaid).toBeCloseTo(10_000, 2);
    expect(loan.totalPaid).toBeCloseTo(10_000 + loan.totalInterest, 2);
    // Interest shrinks and principal grows over time.
    expect(loan.rows[0].interest).toBeGreaterThan(last.interest);
    expect(loan.rows[0].principal).toBeLessThan(last.principal);
  });

  it('rewards higher levels with a lower rate, down to a floor', () => {
    expect(annualRateForLevel(1)).toBeCloseTo(0.32);
    expect(annualRateForLevel(12)).toBeCloseTo(0.265);
    expect(annualRateForLevel(100)).toBe(0.18);
  });
});

describe('progression', () => {
  it('derives level, rank and progress from total XP', () => {
    expect(progressFor(2924)).toEqual({
      level: 12,
      rank: 'Estratega',
      xpInLevel: 174,
      xpForNext: 250,
      cashback: 2,
    });
    expect(progressFor(0).rank).toBe('Novato');
  });

  it('caps cashback at 5% from level 30', () => {
    expect([1, 7, 8, 22, 29, 30].map(cashbackFor)).toEqual([1, 1, 2, 4, 4, 5]);
  });
});

describe('formatMoney', () => {
  it('uses the brand notation for both currencies', () => {
    expect(formatMoney(1284.5, 'PEN')).toBe('S/ 1,284.50');
    expect(formatMoney(-29.99, 'USD')).toBe('-US$ 29.99');
    expect(formatMoney(25, 'PEN', true)).toBe('+S/ 25.00');
  });
});
