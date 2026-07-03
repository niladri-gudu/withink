import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

export default function FeedbackPage() {
  return (
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
            Community Support • Help
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none text-foreground">
            Share your{" "}
            <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
              thoughts.
            </span>
          </h1>
          <p className="text-body-small text-muted-foreground mt-1">Share your thoughts on your sanctuary experience</p>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTES.APP.DASHBOARD}>Back to Today</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Share Feedback</CardTitle>
          <CardDescription>Help us refine withink.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <span className="text-3xl">💬</span>
          <p className="text-body-small text-muted-foreground max-w-sm">
            We are dedicated to building the most peaceful journaling environment. Tell us what you love or what we can improve.
          </p>
          <Button disabled variant="outline">
            Submit Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
