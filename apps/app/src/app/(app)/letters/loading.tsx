import { PageLoadingHeader, PageLoadingShell } from "@/features/app-shell/components/page-loading";

export default function LettersLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        runningHead="Letters"
        eyebrow="sealed with intention"
        title="Letters to"
        accent="future you."
        description="Write today what you want to read later. Each letter opens on the day you choose — never before."
      />

      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="bg-card rounded-xl border p-5">
            <div className="flex items-start gap-4">
              <div className="bg-muted/60 h-5 w-5 rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="bg-muted/60 h-4 w-1/2 animate-pulse rounded-md" />
                <div className="bg-muted/50 h-4 w-28 animate-pulse rounded-md" />
              </div>
              <div className="bg-muted/50 h-3 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </PageLoadingShell>
  );
}
