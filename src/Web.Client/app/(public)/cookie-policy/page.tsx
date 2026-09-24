import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Tydee uses cookies and locally stored data.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        This policy explains the cookies and locally stored data Tydee uses and the choices you
        have about them. When you make a choice on the cookie banner, Tydee records it in your
        browser&apos;s local storage. We do not sell or share your data with third-party advertisers.
      </p>

      <h2 className="text-base font-semibold text-foreground">Cookies we use</h2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong className="font-medium text-foreground">Strictly necessary — session</strong> — an
          httpOnly <code>refresh_token</code> cookie that keeps you signed in. It is set only after
          you log in and is required for the app to function. No consent is required for this cookie.
        </li>
      </ul>

      <h2 className="text-base font-semibold text-foreground">Locally stored data</h2>
      <p>
        Tydee stores data in your browser&apos;s localStorage to support the app: cached data for
        offline use, a queue of changes made while offline, your theme preference, and your cookie
        consent choice. This data stays on your device and is not read by third parties.
      </p>

      <h2 className="text-base font-semibold text-foreground">No tracking cookies</h2>
      <p>
        Tydee does not use analytics, advertising, or other third-party tracking cookies. Because no
        non-essential or tracking cookies exist, choosing <strong className="font-medium text-foreground">Necessary
        only</strong> on the banner simply records your preference; declining does not remove any
        functionality or change how the app behaves.
      </p>

      <h2 className="text-base font-semibold text-foreground">Managing your choice</h2>
      <p>
        You can change or clear your stored preference at any time by clearing browser storage for
        this site. To opt out generally, most browsers let you manage cookies and site data through
        their settings.
      </p>
    </LegalPage>
  );
}