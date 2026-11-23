import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="flex flex-col gap-5 border-y border-border py-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,2fr)] md:gap-10">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-12">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
      <span className="sr-only">Loading workspace</span>
    </div>
  );
}
