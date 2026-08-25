import { Skeleton } from "@withink/ui/skeleton";

import {
  PageLoadingHeader,
  PageLoadingShell,
} from "@/features/app-shell/components/page-loading";

/**
 * Mirrors the feedback page: PageHeader, then the form card — category cards,
 * subject + message fields, screenshot dropzone, and the submit button — all
 * in skeleton form at the same footprint.
 */
export default function FeedbackLoading() {
  return (
    <PageLoadingShell>
      <PageLoadingHeader
        runningHead="Feedback"
        eyebrow="a note for the hands that built it"
        title="Share your"
        accent="thoughts."
        description="Report an issue, suggest an idea, or simply tell us how it feels."
      />

      <div className="rounded-xl border p-6 shadow-sm sm:p-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-[76px] rounded-xl" />
            <Skeleton className="h-[76px] rounded-xl" />
            <Skeleton className="h-[76px] rounded-xl" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div className="mt-5 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        <div className="mt-5">
          <Skeleton className="h-20 w-full rounded-xl border-dashed" />
        </div>

        <Skeleton className="mt-6 h-11 w-full rounded-xl sm:w-32" />
      </div>
    </PageLoadingShell>
  );
}
