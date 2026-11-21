import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading workspace</span>
    </div>
  );
}
