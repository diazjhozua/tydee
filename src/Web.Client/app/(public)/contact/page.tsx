import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_OPERATOR } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the Tydee operator.",
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        Tydee is operated by {LEGAL_OPERATOR.name}. For account help, privacy requests, legal
        notices, or accessibility feedback, reach out by email.
      </p>

      <h2 className="text-base font-semibold text-foreground">Email</h2>
      <p>
        <a
          href={`mailto:${LEGAL_OPERATOR.email}`}
          className="text-primary hover:underline"
        >
          {LEGAL_OPERATOR.email}
        </a>
      </p>

      <h2 className="text-base font-semibold text-foreground">Response times</h2>
      <p>
        This is a small project maintained by one person. We read every message and aim to reply as
        soon as reasonably possible.
      </p>

      <h2 className="text-base font-semibold text-foreground">Support only</h2>
      <p>
        Contact is for product, account, and legal questions. We cannot provide financial,
        investment, tax, or legal advice — please consult a qualified professional for those needs.
      </p>
    </LegalPage>
  );
}