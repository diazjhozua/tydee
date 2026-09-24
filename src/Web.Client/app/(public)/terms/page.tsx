import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_OPERATOR } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The rules for using the Tydee budgeting app.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>
        These Terms & Conditions govern your use of Tydee, an envelope-budgeting application
        operated by {LEGAL_OPERATOR.name}. By creating an account or using the service, you agree to
        these terms.
      </p>

      <h2 className="text-base font-semibold text-foreground">Eligibility and your account</h2>
      <p>
        You must be able to form a binding contract to use Tydee. You are responsible for keeping
        your login credentials secure and for all activity that happens under your account. Notify us
        promptly if you suspect unauthorized access.
      </p>

      <h2 className="text-base font-semibold text-foreground">Your content and intellectual property</h2>
      <p>
        You retain ownership of the financial data you enter. The Tydee name, software, design, and
        branding are owned by {LEGAL_OPERATOR.name} and are protected by applicable intellectual
        property laws. You may not copy, resell, or reverse-engineer the service except as permitted
        by law.
      </p>

      <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
      <p>
        You agree not to misuse the service, attempt to gain unauthorized access, disrupt its
        operation, or use it for unlawful purposes.
      </p>

      <h2 className="text-base font-semibold text-foreground">Availability and changes</h2>
      <p>
        Tydee is provided as-is and may change, be suspended, or be discontinued at any time. We may
        update these terms; continued use after an update means you accept the revised terms.
      </p>

      <h2 className="text-base font-semibold text-foreground">Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Tydee is provided without warranties, and{" "}
        {LEGAL_OPERATOR.name} is not liable for any indirect, incidental, or consequential damages,
        or for any loss of data or profits, arising from your use of the service. Tydee is a
        tracking tool, not financial advice.
      </p>

      <h2 className="text-base font-semibold text-foreground">Termination</h2>
      <p>
        You may stop using Tydee and request deletion of your account at any time. We may suspend or
        terminate access if these terms are violated.
      </p>

      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <p>
        Questions about these terms? Contact{" "}
        <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-primary hover:underline">
          {LEGAL_OPERATOR.email}
        </a>
        .
      </p>
    </LegalPage>
  );
}