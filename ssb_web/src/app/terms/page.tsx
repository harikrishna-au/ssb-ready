import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use">
      <p>By creating an account or using ReadyKadet you agree to these terms.</p>
      <h2>What ReadyKadet is</h2>
      <p>ReadyKadet is a practice tool for the Services Selection Board. Scores and feedback are produced by AI to help you practise. They are not an official assessment and do not predict the result of any selection board. ReadyKadet is independent and is not affiliated with the Indian Armed Forces or any recruiting body.</p>
      <h2>Your account</h2>
      <p>You are responsible for activity on your account. Do not share your login or use the service to harm others or to disrupt it.</p>
      <h2>Your content</h2>
      <p>You keep ownership of what you write. You allow us to store it and send it to our AI provider to produce your feedback.</p>
      <h2>Paid access</h2>
      <p>Lifetime access is a one-time payment of {LEGAL.price}. It applies to your account for as long as the service is offered. Refunds are covered in the <a href="/refunds">refund policy</a>.</p>
      <h2>Changes and availability</h2>
      <p>We may change features or these terms. The service is provided as is and may sometimes be unavailable.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a></p>
    </LegalPage>
  );
}
