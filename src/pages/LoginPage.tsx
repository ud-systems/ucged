import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

gsap.registerPlugin(useGSAP);

export default function LoginPage() {
  const { user, loading, login, isPreview } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useGSAP(
    () => {
      const form = pageRef.current?.querySelector("form");
      if (!form) return;

      const items = form.querySelectorAll("[data-login-el]");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        gsap.set([form, items], { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(form, { autoAlpha: 0, y: 36, scale: 0.96, duration: 0.7, clearProps: "transform" }).from(
        items,
        { autoAlpha: 0, y: 18, duration: 0.45, stagger: 0.07, clearProps: "transform" },
        "-=0.42",
      );
    },
    { scope: pageRef },
  );

  if (!loading && user) return <Navigate to="/queue" replace />;

  return (
    <div
      ref={pageRef}
      className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_hsl(90_33%_94%),_hsl(90_33%_96%)_45%)] px-4"
    >
      <form
        className="w-full max-w-md rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)] flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const err = await login(email || "preview@cge.local", password || "preview");
          setBusy(false);
          if (err) setError(err);
        }}
      >
        <div className="flex flex-col gap-1">
          <div data-login-el className="size-10 rounded-xl bg-primary grid place-items-center mb-3">
            <img src="/white logo.png" alt="Logo" className="size-5 object-contain" />
          </div>
          <h1 data-login-el className="font-heading text-2xl font-semibold">
            Sign in to CGE
          </h1>
          <p data-login-el className="text-sm text-muted-foreground">
            Follow up inactive Shopify customers assigned to you.
          </p>
          {isPreview && (
            <p data-login-el className="text-xs rounded-lg bg-primary/10 text-foreground border border-primary/20 px-3 py-2 mt-2">
              UI preview mode (no CGE Supabase yet). Click Sign in to tour the app with mock data.
            </p>
          )}
        </div>
        <div data-login-el className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="email@uniquedistribution.com"
          />
        </div>
        <div data-login-el className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button data-login-el className="w-full h-11 rounded-xl" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
