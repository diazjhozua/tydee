import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Tydee is a tracking tool, not financial advice.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <h2 className="text-base font-semibold text-foreground">Not financial advice</h2>
      <p>
        Tydee is a budgeting and expense-tracking tool. Anything the app displays — balances,
        allocations, spending totals, or reminders — is informational only and does not constitute
        financial, investment, tax, or legal advice. Always consult a qualified professional before
        making financial decisions.
      </p>

      <h2 className="text-base font-semibold text-foreground">Informational content only</h2>
      <p>
        Content in the app is provided for general information. We strive for accuracy, but we do
        not warrant that it is error-free, complete, or current.
      </p>

      <h2 className="text-base font-semibold text-foreground">No guarantee, no liability</h2>
      <p>
        Tydee is provided &quot;as is.&quot; To the maximum extent permitted by law, we accept no
        responsibility for decisions you make based on the app, for any errors in your records, or
        for any loss arising from use of the service. You are responsible for the accuracy of the
        data you enter and for keeping your own financial records.
      </p>

      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <p>
        Have a question about this disclaimer? Get in touch using the{" "}
        <a href="/contact" className="text-primary hover:underline">
          contact page
        </a>
        .
      </p>
    </LegalPage>
  );
}