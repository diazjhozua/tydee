import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Tydee",
    template: "%s · Tydee",
  },
  description:
    "Simple envelope budgeting: split your income into accounts, log daily expenses, and always know how much is left.",
  appleWebApp: {
    capable: true,
    title: "Tydee",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Tydee",
    description: "Simple envelope-style expense and savings tracker",
    url: appUrl,
    siteName: "Tydee",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Tydee",
    description: "Simple envelope-style expense and savings tracker",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

/**
 * Applies the stored theme to <html> before first paint so the page never
 * flashes the wrong colours. Runs as a Server Component tag, so React never
 * renders a <script> on the client. ThemeProvider then mirrors this decision
 * into React state on hydration.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
          <Toaster position="top-center" richColors />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
