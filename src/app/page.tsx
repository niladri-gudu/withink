import { ArrowRight, Leaf, ShieldCheck, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      {/* Hero Section */}
      <header className="relative max-w-5xl mx-auto text-center pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-125 bg-accent/10 blur-[120px] rounded-full -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Leaf className="h-3 w-3" />
          <span>A safe space for your thoughts</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1] text-main">
          Clear your mind, <br />
          <span className="text-muted-foreground italic font-serif">
            one word at a time.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
          Don't let your thoughts weigh you down. A minimalist journal designed 
          to help you process anxiety, build a writing habit, and find 
          a moment of peace every day.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:opacity-90 px-8 h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105"
          >
            Start Journaling Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-14 px-8 text-muted-foreground hover:text-foreground"
          >
            Learn the Method
          </Button>
        </div>
      </header>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6 pb-32">
        <FeatureCard
          icon={<PenLine className="h-6 w-6 text-accent" />}
          title="Minimalist Editor"
          description="A distraction-free environment designed to make writing feel effortless and calming."
        />
        <FeatureCard
          icon={<ShieldCheck className="h-6 w-6 text-accent" />}
          title="Private & Secure"
          description="Your thoughts are yours alone. We prioritize security so you can express yourself without fear."
        />
        <FeatureCard
          icon={<Sparkles className="h-6 w-6 text-accent" />}
          title="Mindful Prompts"
          description="Gentle nudges and habit tracking to help you turn journaling into a lifelong practice."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-8 border border-border rounded-3xl bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:-translate-y-1">
      <div className="mb-4 p-3 rounded-2xl bg-background border border-border w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-main">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}