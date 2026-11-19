import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-stone-50 px-6 text-center text-stone-900">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        {siteConfig.name}
      </p>
      <h1 className="text-2xl font-semibold">
        {siteConfig.demoStore} operations
      </h1>
      <p className="max-w-sm text-sm leading-6 text-stone-500">
        Foundation build. The application shell and operational modules arrive
        in later phases.
      </p>
    </main>
  );
}
