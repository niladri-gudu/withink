"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@withink/ui/button";
import { ArrowRight } from "lucide-react";

import { ROUTES } from "@/constants/routes";

/**
 * Landed here from the Better Auth `/verify-email` redirect
 * (`callbackURL=/verified`, see `sendVerificationEmail` in `src/lib/auth.ts`).
 *
 * Better Auth appends `?error=<code>` to the callback URL whenever the token is
 * rejected (TOKEN_EXPIRED, INVALID_TOKEN, USER_NOT_FOUND, INVALID_USER). A
 * token can also be spent by this page itself (e.g. an inbox client
 * preview-fetches the link), in which case the user arrives with no params
 * even though the account is verified — so that case is only shown as a
 * softer, "likely already verified" state, never as a fresh confirmation.
 */
export function VerifiedContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  return (
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md space-y-6 rounded-xl border p-6 shadow-sm duration-300 select-none sm:space-y-8 sm:p-8">
      {errorCode ? (
        <InvalidLinkState errorCode={errorCode} />
      ) : (
        <AlreadyVerifiedState />
      )}
    </div>
  );
}

function InvalidLinkState({ errorCode }: { errorCode: string }) {
  return (
    <>
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 text-foreground font-serif font-bold">
          This link is invalid or expired.
        </h1>
        <p className="text-running-head text-muted-foreground">
          Request a new verification email
        </p>
      </div>

      <div role="alert" className="space-y-2">
        <p className="text-muted-foreground font-serif text-sm leading-relaxed">
          Verification links expire after 24 hours and can only be used once.
          Sign in to request a fresh link, or start again if you never finished
          registering.
        </p>
        <p className="text-muted-foreground/60 font-serif text-[10px] tracking-tight uppercase">
          Reference: {errorCode}
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <Button
          asChild
          className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium tracking-[0.15em] uppercase transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Link href={ROUTES.AUTH.LOGIN}>
            Sign in to request a new link{" "}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <div className="text-center">
          <Link
            href={ROUTES.AUTH.REGISTER}
            className="text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-foreground inline-block border-b pb-0.5 font-serif text-xs tracking-widest uppercase italic transition-all"
          >
            Start over with a new account
          </Link>
        </div>
      </div>
    </>
  );
}

function AlreadyVerifiedState() {
  return (
    <>
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 text-foreground font-serif font-bold">
          Your email is verified.
        </h1>
        <p className="text-running-head text-muted-foreground">
          Your notebook is ready for its first page
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <Button
          asChild
          className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium tracking-[0.15em] uppercase transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Link href={ROUTES.APP.DASHBOARD}>
            Go to Journal <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <div className="text-center">
          <Link
            href={ROUTES.PUBLIC.HOME}
            className="text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-foreground inline-block border-b pb-0.5 font-serif text-xs tracking-widest uppercase transition-all"
          >
            Return Home
          </Link>
        </div>
      </div>
    </>
  );
}
