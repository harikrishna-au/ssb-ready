import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>This policy explains what ReadyKadet collects when you use the website and how it is used.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address and sign-in method, handled by our sign-in provider, Clerk.</li>
        <li>Your practice content: the stories, sentences, interview answers and PIQ details you type, and the scores and feedback produced.</li>
        <li>Your preferences, such as the exam you are preparing for.</li>
        <li>Your PIQ: personal, education, family and activity details you enter in the PIQ form (religion and category are optional). It is stored against your account, and sent to an AI service only when you use the mock interview.</li>
        <li>Payment details are handled by our payment provider. We do not store card numbers.</li>
      </ul>
      <h2>How it is used</h2>
      <ul>
        <li>To run the tests, score your answers and show your history.</li>
        <li>Your answers are sent to an AI service (OpenAI) so they can be scored. They are sent only when you submit a test.</li>
        <li>To respond to support requests.</li>
      </ul>
      <h2>What we do not do</h2>
      <p>We do not sell your personal information and we do not show third-party ads.</p>
      <h2>Your choices</h2>
      <p>You can ask us to export or delete your account and practice data by writing to <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> from the email you signed up with.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a></p>
    </LegalPage>
  );
}
