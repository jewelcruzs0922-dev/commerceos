import { PageHeader } from "@/components/app/page-header";
import { SetupNotice } from "@/components/app/setup-notice";

export function BackendRequired({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} description={description} />
      <SetupNotice />
      <p className="max-w-xl text-xs leading-5 text-muted-foreground">
        This module reads and writes store data, so it stays behind the
        authenticated data layer. No placeholder records are shown in its place.
      </p>
    </div>
  );
}
