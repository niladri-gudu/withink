import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Feather } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col items-center justify-center space-y-6 p-6 text-center">
      <div className="space-y-2">
        <span className="border-border bg-secondary/50 text-muted-foreground mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
          <Feather className="h-7 w-7" />
        </span>
        <h2 className="text-foreground font-serif text-2xl font-semibold tracking-tight">
          Lost in thought
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The page you are seeking does not exist or has wandered off.
          Let&apos;s guide you back to a familiar path.
        </p>
      </div>

      <Button asChild>
        <Link href="/">Return to Diary</Link>
      </Button>
    </div>
  );
}
