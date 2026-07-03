import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
      <div className="space-y-2">
        <span className="text-4xl">🌾</span>
        <h2 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
          Lost in thought
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The page you are seeking does not exist or has wandered off. Let&apos;s guide you back to a familiar path.
        </p>
      </div>

      <Button asChild>
        <Link href="/">Return to Sanctuary</Link>
      </Button>
    </div>
  );
}
