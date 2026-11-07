import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Refund policy" };

export default function Refunds() {
  return (
    <LegalPage title="Refund policy">
      <p>Paid access is {LEGAL.monthlyPrice} for a month, {LEGAL.threeMonthPrice} for three months, or {LEGAL.yearPrice} for a year.</p>
      <h2>Requesting a refund</h2>
      <p>If you are not satisfied, write to <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> within {LEGAL.refundWindowDays} days of paying. Use the email address you signed up with and tell us what went wrong.</p>
      <h2>How refunds are paid</h2>
      <p>Approved refunds go back to the original payment method. Your bank may take several working days to show it.</p>
    </LegalPage>
  );
}
