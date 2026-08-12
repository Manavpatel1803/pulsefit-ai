import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import AmbientBackground from "@/components/AmbientBackground";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import { cn } from "@/lib/utils";

// Runs before hydration so the very first paint already has the right theme —
// without this, the page would flash dark (the :root default) for a returning
// light-mode user before React mounts and corrects it.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("pulsefit-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Self-hosted (not next/font/google): Google's CDN was intermittently 404ing on the
// generated font-file hash for this family, breaking `next build`. A local variable-weight
// file removes the live-fetch dependency entirely.
const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PulseFit AI — Read your body's signal",
  description:
    "AI-powered fitness and biometric intelligence. Track readiness, generate adaptive training and nutrition plans, and let AuraCoach adjust your load in real time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme-init script (below) sets data-theme on this element before React
      // hydrates, on purpose — server-rendered HTML has no access to localStorage, so
      // this attribute legitimately differs between server and pre-hydration client.
      suppressHydrationWarning
      className={cn("h-full", "antialiased", spaceGrotesk.variable, inter.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <AmbientBackground />
          <AppProvider>
            <ToastProvider>{children}</ToastProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
