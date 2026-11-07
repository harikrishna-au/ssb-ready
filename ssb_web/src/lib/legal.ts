/** Edit these in one place. The pricing page, checkout, and legal pages read from here. */

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** What checkout can charge. The server uses the same ids and rupee amounts. */
export const PLANS = [
  { id: "month", label: "Monthly", inr: 199, detail: "per month", price: rupee(199) },
  { id: "quarter", label: "3 months", inr: 499, detail: "for 3 months", price: rupee(499) },
  { id: "year", label: "Year", inr: 1200, detail: "for the year", price: rupee(1200) },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const LEGAL = {
  supportEmail: "support@readykadet.com",
  effectiveDate: "1 November 2026",
  refundWindowDays: 7,
  monthlyPrice: PLANS[0].price,
  threeMonthPrice: PLANS[1].price,
  yearPrice: PLANS[2].price,
};

export function planById(id: string) {
  return PLANS.find((p) => p.id === id) ?? PLANS[2];
}
