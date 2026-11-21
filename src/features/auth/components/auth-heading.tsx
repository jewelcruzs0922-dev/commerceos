export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
