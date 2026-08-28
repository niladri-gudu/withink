export default function LettersLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="border-border/70 animate-pulse border-b pb-3">
        <div className="bg-muted/60 h-3 w-20 rounded-md" />
      </div>
      <div className="space-y-3">
        <div className="bg-muted/60 h-5 w-40 animate-pulse rounded-md" />
        <div className="bg-muted/50 h-10 w-72 animate-pulse rounded-md" />
        <div className="bg-muted/60 h-4 w-96 animate-pulse rounded-md" />
      </div>
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
    </div>
  );
}
