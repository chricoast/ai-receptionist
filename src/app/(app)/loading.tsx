/** Shown instantly while a page loads, so tapping the menu feels immediate. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true">
      <div className="h-10 w-56 rounded-2xl bg-neutral-200" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-3xl bg-neutral-200/70" />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-neutral-200/60" />
    </div>
  );
}
