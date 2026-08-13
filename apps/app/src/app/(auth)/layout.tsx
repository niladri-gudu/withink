import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Ruled ledger paper behind the auth card */}
      <div
        aria-hidden="true"
        className="ledger-rules pointer-events-none fixed inset-0"
      />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/"
            className="text-foreground font-serif text-3xl font-bold tracking-tight"
          >
            withink<span className="text-accent">.</span>
          </Link>
          <p className="text-muted-foreground/70 font-hand text-xl">
            the inside of your private notebook
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
