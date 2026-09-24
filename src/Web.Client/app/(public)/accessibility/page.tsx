import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_OPERATOR } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Tydee's commitment to digital accessibility.",
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility">
      <p>
        Tydee aims to be usable by everyone, including people with disabilities. We follow widely
        recognized accessibility guidelines and evaluate the app against them as it evolves.
      </p>

      <h2 className="text-base font-semibold text-foreground">Our commitment</h2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Design against WCAG (Web Content Accessibility Guidelines) principles.</li>
        <li>Keyboard-navigable controls with visible focus states.</li>
        <li>Meaningful labels and text alternatives for controls and icons.</li>
        <li>Support for screen readers and system font and theme settings.</li>
        <li>Color contrast that meets WCAG AA standards, including in dark mode.</li>
      </ul>

      <h2 className="text-base font-semibold text-foreground">Known limitations</h2>
      <p>
        Some charts and color-based category markers include text labels so information is not
        conveyed by color alone. If you encounter a barrier, please tell us so we can improve.
      </p>

      <h2 className="text-base font-semibold text-foreground">Reporting a problem</h2>
      <p>
        If you have trouble using Tydee, contact {LEGAL_OPERATOR.name} at{" "}
        <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-primary hover:underline">
          {LEGAL_OPERATOR.email}
        </a>{" "}
        with a description of the issue, and we will review it and work to address it.
      </p>
    </LegalPage>
  );
}