/**
 * HTML privacy policy for SSB Ready (served at GET /privacy).
 * @param {{ supportEmail: string, publicUrl: string, effectiveDate: string }} opts
 */
function buildPrivacyPolicyHtml({ supportEmail, publicUrl, effectiveDate }) {
  const contact = supportEmail || 'support@ssbready.app';
  const site = publicUrl || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — SSB Ready</title>
  <meta name="description" content="Privacy Policy for the SSB Ready mobile application." />
  <style>
    :root {
      --bg: #f4f7ff;
      --card: #ffffff;
      --text: #101828;
      --muted: #667085;
      --accent: #216e5c;
      --border: #e4e7ec;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
    }
    header {
      background: linear-gradient(135deg, #0e3f36 0%, #255b90 100%);
      color: #fff;
      padding: 2.5rem 1.25rem;
      text-align: center;
    }
    header h1 { margin: 0 0 0.35rem; font-size: 1.75rem; font-weight: 800; }
    header p { margin: 0; opacity: 0.9; font-size: 0.95rem; }
    main {
      max-width: 720px;
      margin: -1.5rem auto 3rem;
      padding: 0 1rem;
    }
    article {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.75rem 1.5rem;
      box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06);
    }
    h2 {
      font-size: 1.1rem;
      margin: 1.75rem 0 0.5rem;
      color: var(--accent);
    }
    h2:first-of-type { margin-top: 0; }
    p, li { font-size: 0.95rem; color: var(--text); }
    ul { padding-left: 1.25rem; }
    a { color: #5948ff; }
    footer {
      margin-top: 1.5rem;
      font-size: 0.85rem;
      color: var(--muted);
      text-align: center;
    }
    .badge {
      display: inline-block;
      margin-top: 0.75rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.15);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>SSB Ready</h1>
    <p>Privacy Policy</p>
    <span class="badge">Effective ${effectiveDate}</span>
  </header>
  <main>
    <article>
      <p>
        This Privacy Policy describes how <strong>SSB Ready</strong> (“we”, “our”, or “us”)
        collects, uses, and protects information when you use our mobile application
        <strong>SSB Ready</strong> (package <code>com.ssbready</code>) and related services
        (collectively, the “Service”). The Service helps candidates prepare for the
        Services Selection Board (SSB) through practice tests, assessments, and study tools.
      </p>

      <h2>1. Information we collect</h2>
      <p>Depending on how you use the Service, we may collect:</p>
      <ul>
        <li><strong>Account information:</strong> email address, display name, and authentication identifiers when you sign up or sign in (including Google Sign-In, if you choose it).</li>
        <li><strong>Profile preferences:</strong> your selected candidate category (for example, fresher or repeater) to personalize content.</li>
        <li><strong>Practice and test data:</strong> responses you submit in tests such as OIR, PPDT, WAT, SRT, TAT, mock interviews, and related progress or history stored for your account.</li>
        <li><strong>Images you provide:</strong> if you upload or capture photos (for example, handwritten stories or forms), we process them only to provide features such as text recognition or evaluation you request.</li>
        <li><strong>Technical data:</strong> basic device and app diagnostics needed to operate and secure the Service (for example, app version, crash logs if enabled by your platform).</li>
      </ul>

      <h2>2. How we use information</h2>
      <p>We use the information above to:</p>
      <ul>
        <li>Create and manage your account and keep you signed in.</li>
        <li>Deliver practice tests, store your results, and show progress.</li>
        <li>Provide AI-assisted feedback and evaluation when you submit content for assessment.</li>
        <li>Improve reliability, security, and user experience of the Service.</li>
        <li>Respond to support requests and comply with applicable law.</li>
      </ul>

      <h2>3. Third-party services</h2>
      <p>We use trusted providers to run the Service. They process data only as needed to perform their role:</p>
      <ul>
        <li><strong>Google Firebase</strong> — authentication and cloud database (Firestore) for account and app data.</li>
        <li><strong>Google Sign-In</strong> — optional sign-in, subject to Google’s privacy policy.</li>
        <li><strong>AI providers</strong> — content you submit for evaluation may be processed by AI services (for example, OpenAI) via our backend to generate feedback.</li>
        <li><strong>Hosting</strong> — our API may be hosted on cloud platforms (for example, Render) that process network and server logs.</li>
      </ul>
      <p>
        These providers have their own privacy policies. We encourage you to review them.
        We do not sell your personal information.
      </p>

      <h2>4. Storage and security</h2>
      <p>
        Data is stored using industry-standard services with access controls.
        Authentication tokens are used to protect API requests.
        No method of transmission or storage is 100% secure; we work to protect your data
        but cannot guarantee absolute security.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain your information while your account is active and as needed to provide
        the Service, comply with legal obligations, resolve disputes, and enforce our terms.
        You may request deletion of your account and associated data by contacting us (see below).
      </p>

      <h2>6. Your choices and rights</h2>
      <ul>
        <li>You can sign out at any time from the app.</li>
        <li>You can avoid optional features (such as camera uploads) if you do not wish to provide images.</li>
        <li>Depending on your location, you may have rights to access, correct, or delete personal data — contact us to exercise these rights.</li>
      </ul>

      <h2>7. Children</h2>
      <p>
        The Service is intended for users preparing for SSB who are generally 18 years of age or older.
        We do not knowingly collect personal information from children under 13.
        If you believe we have collected such information, contact us and we will delete it.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time.
        The “Effective” date at the top will change when we do.
        Continued use of the Service after changes means you accept the updated policy.
      </p>

      <h2>9. Contact us</h2>
      <p>
        For privacy questions, data requests, or account deletion, email:
        <a href="mailto:${contact}">${contact}</a>.
      </p>
      ${site ? `<p>Policy URL: <a href="${site}/privacy">${site}/privacy</a></p>` : ''}
    </article>
    <footer>
      &copy; ${new Date().getUTCFullYear()} SSB Ready. All rights reserved.
    </footer>
  </main>
</body>
</html>`;
}

module.exports = { buildPrivacyPolicyHtml };
