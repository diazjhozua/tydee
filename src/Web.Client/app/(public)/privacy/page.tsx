import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_OPERATOR } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tydee collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains what personal data Tydee collects, why we collect it, how we
        use it, and the rights you have over it. Tydee is a personal envelope-budgeting tool
        operated by {LEGAL_OPERATOR.name}.
      </p>

      <h2 className="text-base font-semibold text-foreground">Data we collect</h2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong className="font-medium text-foreground">Account data:</strong> your email address
          and name, and a hashed password. We never store your password in plain text.
        </li>
        <li>
          <strong className="font-medium text-foreground">Financial data you enter:</strong>{" "}
          accounts, income, allocations, expenses, transfers, and adjustments you choose to record.
        </li>
        <li>
          <strong className="font-medium text-foreground">Technical data:</strong> a session cookie
          and locally stored app data required to keep you signed in and to work offline. See the{" "}
          <a href="/cookie-policy" className="text-primary hover:underline">
            Cookie Policy
          </a>
          .
        </li>
      </ul>

      <h2 className="text-base font-semibold text-foreground">How we use your data</h2>
      <p>
        We use your data solely to operate Tydee: authenticating you, storing and displaying your
        budgeting records, sending account emails (verification and password reset), and keeping the
        service secure. We do not sell your personal data, and we do not use it for advertising.
      </p>

      <h2 className="text-base font-semibold text-foreground">Legal bases and your rights</h2>
      <p>
        Depending on where you live, you may have rights under laws such as the GDPR or CCPA-style
        regimes, including the right to access, correct, export, or delete your personal data, and
        to object to or restrict certain processing. You can exercise these by contacting us using
        the details below. You can also request deletion of your account and associated data.
      </p>

      <h2 className="text-base font-semibold text-foreground">Retention and security</h2>
      <p>
        We retain your data for as long as your account is active, and delete or anonymize it when
        you close your account. Passwords are hashed, refresh tokens are stored as hashes with
        rotation and reuse detection, and password-reset tokens are single-use and expire after one
        hour.
      </p>

      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <p>
        For any privacy question or request, contact {LEGAL_OPERATOR.name} at{" "}
        <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-primary hover:underline">
          {LEGAL_OPERATOR.email}
        </a>
        .
      </p>
    </LegalPage>
  );
}