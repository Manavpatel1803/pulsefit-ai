"use client";

import { useRef, useState } from "react";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useApp } from "@/context/AppContext";
import { EASE } from "@/lib/motion";
import PulseWave from "./PulseWave";

type OAuthProvider = "google" | "facebook" | "apple";

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.66-.22-2.44H12v4.62h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.26a12 12 0 0 0 0 10.74l4.01-3.1z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77z"
        />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.462 2.16-1.208 2.923-.816.85-2.09 1.51-3.19 1.42-.14-1.1.44-2.25 1.19-2.99.83-.85 2.25-1.47 3.21-1.35zM20.6 17.37c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.51-4.12 3.53-1.54.02-1.93-1-4.01-.98-2.08.01-2.52.99-4.06.98-1.73-.02-3.06-1.77-4.05-3.33C.35 17.15-.63 12.28.9 8.98c1.08-2.34 3.03-3.82 5.14-3.85 1.62-.03 3.15 1.09 4.14 1.09.98 0 2.83-1.35 4.78-1.15.81.03 3.09.33 4.55 2.48-.12.07-2.71 1.58-2.68 4.72.03 3.75 3.29 4.99 3.32 5.01-.03.09-.5 1.68-1.55 3.09z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"
        />
      </svg>
    ),
  },
];

export default function AuthScreen() {
  const { signIn, signUp, signInWithOAuth } = useApp();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: EASE.settle } });
      tl.from("[data-gsap='logo']", { opacity: 0, y: 16, duration: 0.5 })
        .from("[data-gsap='card']", { opacity: 0, y: 16, duration: 0.5 }, "-=0.35")
        .from(
          "[data-gsap='oauth'] button",
          { opacity: 0, y: 10, duration: 0.35, stagger: 0.06, ease: EASE.standard },
          "-=0.25"
        )
        .from("[data-gsap='footer']", { opacity: 0, y: 8, duration: 0.4 }, "-=0.15");
    },
    { scope: containerRef }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "sign_up") {
        await signUp(email, password, fullName);
        setConfirmSent(true);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
      // On success the browser redirects away to the provider, so this component unmounts.
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not sign in with ${provider}.`);
      setOauthLoading(null);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full bg-indigo/20 blur-[100px] animate-glow-drift"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-emerald/15 blur-[100px] animate-glow-drift"
        style={{ animationDelay: "-9s" }}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-0 top-24 opacity-60">
        <PulseWave height={140} repeats={9} />
      </div>

      <div ref={containerRef} className="relative w-full max-w-sm">
        <div data-gsap="logo" className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo/15 border border-indigo/30 transition-transform hover:scale-105">
            <Activity className="h-5 w-5 text-indigo-glow" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
            PulseFit <span className="text-indigo-glow">AI</span>
          </h1>
          <p className="text-sm text-mist text-center">Read your body&apos;s signal.</p>
        </div>

        <div data-gsap="card" className="glass-raised p-6">
          {confirmSent ? (
            <div className="text-center space-y-2 py-4 animate-fade-up">
              <p className="text-sm text-slate-200">Check your inbox at</p>
              <p className="text-sm font-medium text-indigo-glow data-readout">{email}</p>
              <p className="text-xs text-mist">
                Confirm your email, then sign in below.
              </p>
              <button
                onClick={() => {
                  setConfirmSent(false);
                  setMode("sign_in");
                }}
                className="mt-3 text-xs text-indigo-glow hover:underline active:scale-95 transition-transform"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div data-gsap="oauth" className="grid grid-cols-3 gap-2 mb-5">
                {OAUTH_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleOAuth(p.id)}
                    disabled={oauthLoading !== null}
                    aria-label={`Continue with ${p.label}`}
                    className="flex items-center justify-center rounded-lg bg-white/5 border border-hairline py-2.5 hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
                  >
                    {oauthLoading === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-mist" />
                    ) : (
                      p.icon
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-hairline" />
                <span className="text-[10px] uppercase tracking-wide text-mist-dim">or continue with email</span>
                <div className="h-px flex-1 bg-hairline" />
              </div>
            </>
          )}

          {!confirmSent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ gridTemplateRows: mode === "sign_up" ? "1fr" : "0fr", opacity: mode === "sign_up" ? 1 : 0 }}
              >
                <div className="overflow-hidden">
                  <div className="space-y-1.5 pb-4">
                    <label htmlFor="fullName" className="text-xs font-medium text-mist">
                      Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required={mode === "sign_up"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="auth-input"
                      placeholder="Alex Rivera"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-mist">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-mist">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-400 leading-relaxed animate-fade-up">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo hover:bg-indigo/90 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 text-white text-sm font-medium py-2.5 transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "sign_in" ? "Sign in" : "Create account"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {!confirmSent && (
          <p data-gsap="footer" className="text-center text-xs text-mist mt-4">
            {mode === "sign_in" ? "New to PulseFit AI?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
              className="text-indigo-glow hover:underline font-medium active:scale-95 transition-transform inline-block"
            >
              {mode === "sign_in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        )}
      </div>

      <style jsx global>{`
        .auth-input {
          width: 100%;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--hairline);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        }
        .auth-input::placeholder {
          color: var(--mist-dim);
        }
        .auth-input:hover {
          background: rgba(255, 255, 255, 0.07);
        }
        .auth-input:focus {
          border-color: rgba(129, 140, 248, 0.6);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
        }
      `}</style>
    </div>
  );
}
