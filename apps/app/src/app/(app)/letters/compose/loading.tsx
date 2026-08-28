export default function ComposeLetterLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-[20vh] sm:px-6 sm:pt-8">
      <div className="border-border/40 animate-pulse border-b pb-3">
        <div className="bg-muted/60 h-5 w-48 rounded-md" />
      </div>
      <div className="mt-6 space-y-4">
        <div className="bg-muted/50 h-10 w-3/4 animate-pulse rounded-md" />
        <div className="bg-muted/60 h-8 w-72 animate-pulse rounded-md" />
      </div>
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="bg-muted/40 h-4 animate-pulse rounded-md"
            style={{ width: `${95 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
