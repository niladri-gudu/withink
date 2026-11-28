import * as React from "react";
import { Button } from "@withink/ui/button";
import { Loader2 } from "lucide-react";

import { signIn } from "@/lib/auth-client";

interface GoogleOAuthButtonProps {
  /** Disabled while the main form is submitting. */
  formDisabled?: boolean;
  /** Defaults to the app dashboard, matching the login/register flows. */
  callbackURL: string;
}

/**
 * "Continue with Google" button with a pending state.
 *
 * The `signIn.social` args keep `provider` and `callbackURL` exactly as before;
 * only `disableRedirect` is added so the button can clear its spinner and show
 * a clear error when the provider handshake is rejected (otherwise Better Auth
 * redirects to `callbackURL?error=…` and the failure is invisible here). On
 * success we navigate to the returned provider URL ourselves, which is the
 * same redirect the default flow performs.
 */
export function GoogleOAuthButton({
  formDisabled = false,
  callbackURL,
}: GoogleOAuthButtonProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL,
        disableRedirect: true,
      });

      if (res && "error" in res && res.error) {
        setError(
          res.error.message ||
            "Google sign-in could not be started. Please try again.",
        );
        setIsPending(false);
        return;
      }

      const url =
        res && "data" in res && res.data && typeof res.data.url === "string"
          ? res.data.url
          : null;
      if (url) {
        window.location.href = url;
        return;
      }
      setError("Google sign-in could not be started. Please try again.");
      setIsPending(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again.",
      );
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="text-muted-foreground hover:bg-muted/40 hover:text-foreground h-11 w-full cursor-pointer font-serif text-xs uppercase transition-transform hover:scale-[1.01] active:scale-[0.99]"
        onClick={handleClick}
        disabled={isPending || formDisabled}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
        ) : (
          <GoogleIcon />
        )}
        {isPending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-destructive px-1 text-center font-serif text-[10px] leading-relaxed tracking-tight uppercase"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mr-2 h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
