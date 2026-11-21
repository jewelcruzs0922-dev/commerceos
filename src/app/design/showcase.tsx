"use client";

import Image from "next/image";
import {
  ArchiveIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BoxesIcon,
  ChartNoAxesColumnIcon,
  CopyIcon,
  EllipsisIcon,
  InboxIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark, Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const coreColors = [
  {
    role: "Background",
    token: "--background",
    light: "#F7F8F5",
    dark: "#0B110E",
    use: "Page surface",
  },
  {
    role: "Foreground",
    token: "--foreground",
    light: "#14201A",
    dark: "#E9EFEA",
    use: "Primary text",
  },
  {
    role: "Card",
    token: "--card",
    light: "#FFFFFF",
    dark: "#111915",
    use: "Discrete objects only",
  },
  {
    role: "Muted",
    token: "--muted",
    light: "#EFF2EE",
    dark: "#18241D",
    use: "Table headers, sunken rows",
  },
  {
    role: "Muted text",
    token: "--muted-foreground",
    light: "#5A6860",
    dark: "#A0ADA5",
    use: "Secondary text, labels",
  },
  {
    role: "Border",
    token: "--border",
    light: "#E1E6E0",
    dark: "#26352C",
    use: "Rules and dividers",
  },
  {
    role: "Input",
    token: "--input",
    light: "#89968E",
    dark: "#5D7164",
    use: "Field boundaries",
  },
  {
    role: "Primary",
    token: "--primary",
    light: "#0B6B4B",
    dark: "#34C08A",
    use: "Action, active location",
  },
  {
    role: "Accent",
    token: "--accent",
    light: "#E7F0EA",
    dark: "#1A2C24",
    use: "Hover, selection",
  },
  {
    role: "Destructive",
    token: "--destructive",
    light: "#B42318",
    dark: "#F58A80",
    use: "Delete, refund, void",
  },
  {
    role: "Ring",
    token: "--ring",
    light: "#0B6B4B",
    dark: "#34C08A",
    use: "Focus",
  },
  {
    role: "Sidebar",
    token: "--sidebar",
    light: "#FBFCFA",
    dark: "#0F1713",
    use: "Application shell",
  },
] as const;

const chartSeries = [
  { label: "Series 1", light: "#0B6B4B", dark: "#34C08A", note: "Revenue" },
  { label: "Series 2", light: "#2B5B85", dark: "#7BB2DE", note: "Orders" },
  { label: "Series 3", light: "#8A5A12", dark: "#D8A657", note: "Refunds" },
  { label: "Series 4", light: "#5A6860", dark: "#A0ADA5", note: "Comparison" },
] as const;

const iconSamples = [
  { icon: ShoppingBagIcon, label: "Orders" },
  { icon: PackageIcon, label: "Products" },
  { icon: BoxesIcon, label: "Inventory" },
  { icon: UsersIcon, label: "Customers" },
  { icon: ChartNoAxesColumnIcon, label: "Analytics" },
  { icon: SettingsIcon, label: "Settings" },
] as const;

const paymentTone: Record<string, string> = {
  Paid: "border-success/30 bg-success-surface text-success",
  Pending: "border-warning/30 bg-warning-surface text-warning",
  Refunded: "border-danger/30 bg-danger-surface text-danger",
};

const fulfillmentTone: Record<string, string> = {
  Fulfilled: "border-success/30 bg-success-surface text-success",
  "In transit": "border-info/30 bg-info-surface text-info",
  Returned: "border-danger/30 bg-danger-surface text-danger",
  Unfulfilled: "border-neutral-status/30 bg-neutral-status-surface text-neutral-status",
};

const specimenRows = [
  {
    number: "ORD-1042",
    customer: "Dana Whitfield",
    payment: "Paid",
    fulfillment: "Fulfilled",
    total: "$184.00",
    placed: "Nov 18",
  },
  {
    number: "ORD-1041",
    customer: "Marco Reyes",
    payment: "Paid",
    fulfillment: "In transit",
    total: "$92.50",
    placed: "Nov 18",
  },
  {
    number: "ORD-1040",
    customer: "Priya Anand",
    payment: "Pending",
    fulfillment: "Unfulfilled",
    total: "$0.00",
    placed: "Nov 17",
  },
  {
    number: "ORD-1039",
    customer: "Jonah Fields",
    payment: "Refunded",
    fulfillment: "Returned",
    total: "$48.00",
    placed: "Nov 17",
  },
] as const;

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-1">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function TypeRow({
  sample,
  size,
  weight,
  mono = false,
  className,
}: {
  sample: string;
  size: string;
  weight: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 md:flex-row md:items-baseline md:justify-between md:gap-8">
      <p
        className={`${mono ? "font-mono tabular-nums" : ""} ${className ?? ""}`}
      >
        {sample}
      </p>
      <p className="shrink-0 font-mono text-xs text-muted-foreground">
        {size} / {weight}
      </p>
    </div>
  );
}

export function DesignShowcase() {
  return (
    <div className="min-h-svh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-overlay"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Wordmark />
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs font-medium text-muted-foreground">
              Design system
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex max-w-6xl scroll-mt-16 flex-col gap-12 px-4 py-10 outline-none sm:px-6 lg:px-8"
      >
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-[32px] leading-10 font-semibold tracking-tight">
            Quiet operations
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            The visual reference for CommerceOS. Emerald marks the action and
            the current location; everything else stays neutral so figures and
            status carry the signal. Geist for interface text, Geist Mono for
            identifiers and amounts.
          </p>
          <p className="text-xs text-muted-foreground">
            Phase 2 reference route. No store records, no navigation shell, no
            feature workflows.
          </p>
        </div>

        <section className="flex flex-col gap-6" aria-labelledby="brand-title">
          <SectionHeading
            id="brand-title"
            title="Brand"
            description="An open ring with a ledger rule through the opening. The mark works at 16px, in one color, and without a container."
          />
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-6 border-b border-border pb-6">
                <div className="flex flex-col items-center gap-2">
                  <BrandMark className="size-12" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    48
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <BrandMark className="size-8" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    32
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <BrandMark className="size-6" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    24
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <BrandMark className="size-4" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    16
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Wordmark />
                <span className="text-xs text-muted-foreground">
                  Full lockup, 15px semibold
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Image
                  src="/brand/app-icon.svg"
                  alt="CommerceOS app icon"
                  width={56}
                  height={56}
                  unoptimized
                  className="rounded-2xl"
                />
                <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground">
                  <BrandMark className="size-7 text-background" />
                </div>
                <p className="max-w-[16rem] text-xs leading-5 text-muted-foreground">
                  App icon and mono lockup. Exported as SVG in{" "}
                  <span className="font-mono">public/brand</span>.
                </p>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Rules</CardTitle>
                <CardDescription>
                  The mark is a monogram, not a shopping cart.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>
                  Keep clear space of at least half the ring diameter. Never
                  rotate, outline, or apply a gradient.
                </p>
                <p>
                  The ledger rule is the only colored element; it must use the
                  emerald token, never an arbitrary green.
                </p>
                <p>
                  In one color the mark keeps its shape. Test it on ink and on
                  paper before shipping a new surface.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="color-title"
        >
          <SectionHeading
            id="color-title"
            title="Color"
            description="Neutral surfaces, ink text, one accent. Values below mirror the tokens in globals.css."
          />
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-16">
                    Swatch
                  </TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Token</TableHead>
                  <TableHead scope="col">Light</TableHead>
                  <TableHead scope="col">Dark</TableHead>
                  <TableHead scope="col">Use</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coreColors.map((color) => (
                  <TableRow key={color.token}>
                    <TableCell>
                      <span
                        aria-hidden="true"
                        className="block size-6 rounded-md border border-border"
                        style={{ backgroundColor: `var(${color.token})` }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{color.role}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {color.token}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {color.light}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {color.dark}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {color.use}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Status</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success-surface text-success"
                >
                  Paid
                </Badge>
                <Badge
                  variant="outline"
                  className="border-warning/30 bg-warning-surface text-warning"
                >
                  Pending
                </Badge>
                <Badge
                  variant="outline"
                  className="border-danger/30 bg-danger-surface text-danger"
                >
                  Refunded
                </Badge>
                <Badge
                  variant="outline"
                  className="border-info/30 bg-info-surface text-info"
                >
                  In transit
                </Badge>
                <Badge
                  variant="outline"
                  className="border-neutral-status/30 bg-neutral-status-surface text-neutral-status"
                >
                  Draft
                </Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Status never relies on color alone. Every chip carries a label,
                and controls pair an icon with text.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Chart series</h3>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {chartSeries.map((series) => (
                  <div key={series.label} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="size-3.5 shrink-0 rounded-sm"
                      style={{
                        backgroundColor:
                          `var(--chart-${series.label.slice(-1)})`,
                      }}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">{series.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {series.note}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Four series maximum. Direct labels preferred over legends.
              </p>
            </div>
          </div>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="type-title"
        >
          <SectionHeading
            id="type-title"
            title="Typography"
            description="One sans, one mono. Figures and identifiers are monospaced and tabular so columns stay aligned."
          />
          <div className="flex flex-col">
            <TypeRow
              sample="Operations ledger"
              size="32 / 40"
              weight="600"
              className="text-[32px] leading-10 font-semibold tracking-tight"
            />
            <TypeRow
              sample="Orders"
              size="24 / 32"
              weight="600"
              className="text-2xl leading-8 font-semibold tracking-tight"
            />
            <TypeRow
              sample="Fulfillment"
              size="18 / 26"
              weight="600"
              className="text-lg leading-[26px] font-semibold tracking-tight"
            />
            <TypeRow
              sample="Shipping address"
              size="15 / 22"
              weight="600"
              className="text-[15px] leading-[22px] font-semibold"
            />
            <TypeRow
              sample="Orders placed before 2:00 PM ship the same day."
              size="14 / 22"
              weight="400"
              className="text-sm leading-[22px]"
            />
            <TypeRow
              sample="Updated 4 minutes ago"
              size="13 / 20"
              weight="400"
              className="text-[13px] leading-5 text-muted-foreground"
            />
            <TypeRow
              sample="Payment status"
              size="12 / 16"
              weight="500"
              className="text-xs leading-4 font-medium text-muted-foreground"
            />
            <TypeRow
              sample="$248,900.00"
              size="28 / 34"
              weight="600"
              mono
              className="text-[28px] leading-[34px] font-semibold"
            />
            <TypeRow
              sample="1,284 orders"
              size="16 / 22"
              weight="500"
              mono
              className="text-base leading-[22px] font-medium"
            />
          </div>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="space-title"
        >
          <SectionHeading
            id="space-title"
            title="Spacing and radius"
            description="A 4px base scale. Corners stay between 6 and 14px, except status chips, which are pills."
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Spacing scale</h3>
              <div className="flex items-end gap-4">
                {[
                  ["1", "w-1"],
                  ["2", "w-2"],
                  ["3", "w-3"],
                  ["4", "w-4"],
                  ["6", "w-6"],
                  ["8", "w-8"],
                  ["12", "w-12"],
                  ["16", "w-16"],
                ].map(([token, width]) => (
                  <div key={token} className="flex flex-col items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`${width} h-10 rounded-sm bg-primary/20`}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {token}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Values are Tailwind steps, not arbitrary pixels.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Corner radius</h3>
              <div className="flex items-end gap-4">
                {[
                  ["sm", "rounded-sm", "6"],
                  ["md", "rounded-md", "10"],
                  ["lg", "rounded-lg", "12"],
                  ["xl", "rounded-xl", "14"],
                ].map(([token, radius, value]) => (
                  <div key={token} className="flex flex-col items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`${radius} size-14 border border-border bg-muted`}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {token} · {value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Controls and cards use lg. Dialogs use xl. Small elements use
                sm.
              </p>
            </div>
          </div>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="controls-title"
        >
          <SectionHeading
            id="controls-title"
            title="Controls"
            description="Buttons carry one primary action per region. Fields use visible labels and describe errors in place."
          />
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Buttons</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button>Save changes</Button>
                <Button variant="outline">Export CSV</Button>
                <Button variant="secondary">Duplicate</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="destructive">
                  <TriangleAlertIcon aria-hidden="true" />
                  Refund order
                </Button>
                <Button disabled>Unavailable</Button>
                <Button disabled>
                  <Spinner />
                  Saving
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button variant="outline" size="icon" aria-label="Search">
                  <SearchIcon aria-hidden="true" />
                </Button>
                <Button variant="outline" size="icon-sm" aria-label="More actions">
                  <EllipsisIcon aria-hidden="true" />
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                32px default, 36px for a primary form action, 28px for dense row
                actions. Icon-only buttons always carry an accessible label.
              </p>
            </div>

            <Separator />

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold">Fields</h3>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="product-title">
                        Product title
                      </FieldLabel>
                      <Input
                        id="product-title"
                        defaultValue="Canvas weekend bag"
                      />
                    </Field>
                    <Field data-invalid="true">
                      <FieldLabel htmlFor="sku">SKU</FieldLabel>
                      <Input
                        id="sku"
                        defaultValue="URB-"
                        aria-invalid
                        aria-describedby="sku-error"
                      />
                      <FieldError
                        id="sku-error"
                        errors={[
                          { message: "SKU must be at least 6 characters." },
                        ]}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <Select defaultValue="active">
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Product status</SelectLabel>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Draft products stay hidden from the demo storefront.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder="Waxed canvas, leather trim"
                    />
                    <FieldDescription>
                      Keep it under 160 characters for catalog lists.
                    </FieldDescription>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="track-inventory" defaultChecked />
                    <FieldLabel htmlFor="track-inventory">
                      Track inventory for this variant
                    </FieldLabel>
                  </Field>
                </FieldGroup>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold">Selection controls</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Tabs defaultValue="details">
                    <TabsList>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="pt-3">
                      <p className="text-sm text-muted-foreground">
                        Variants, pricing, and inventory live on one record.
                      </p>
                    </TabsContent>
                    <TabsContent value="activity" className="pt-3">
                      <p className="text-sm text-muted-foreground">
                        Every adjustment writes an immutable movement.
                      </p>
                    </TabsContent>
                    <TabsContent value="notes" className="pt-3">
                      <p className="text-sm text-muted-foreground">
                        Internal notes stay scoped to this store.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <RotateCcwIcon aria-hidden="true" />
                        Request restock
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request restock</DialogTitle>
                        <DialogDescription>
                          Creating a request notifies the manager. It does not
                          change on-hand inventory.
                        </DialogDescription>
                      </DialogHeader>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="restock-quantity">
                            Quantity
                          </FieldLabel>
                          <Input
                            id="restock-quantity"
                            inputMode="numeric"
                            defaultValue="24"
                          />
                          <FieldDescription>
                            Units to add to the next purchase order.
                          </FieldDescription>
                        </Field>
                      </FieldGroup>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button>Create request</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Order actions
                        <EllipsisIcon aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuLabel>ORD-1042</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem>
                          <PencilIcon aria-hidden="true" />
                          Edit order
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CopyIcon aria-hidden="true" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ArchiveIcon aria-hidden="true" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">
                        <TriangleAlertIcon aria-hidden="true" />
                        Cancel order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Low stock threshold"
                      >
                        <InboxIcon aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Low stock at 5 units</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Overlays keep a single layer of elevation. Destructive actions
                  name the object and sit apart from the primary action.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="data-title"
        >
          <SectionHeading
            id="data-title"
            title="Data display"
            description="Tables and figures are the primary surface. Sample rows are specimens, not store records."
          />
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {[
              {
                label: "Net sales",
                value: "$248,900.00",
                delta: "+8.2% vs. previous 30 days",
                up: true,
              },
              {
                label: "Orders",
                value: "1,284",
                delta: "+3.1% vs. previous 30 days",
                up: true,
              },
              {
                label: "Average order value",
                value: "$193.85",
                delta: "-1.4% vs. previous 30 days",
                up: false,
              },
            ].map((metric) => (
              <div key={metric.label} className="bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-1 font-mono text-[28px] leading-[34px] font-semibold tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {metric.up ? (
                    <ArrowUpRightIcon
                      aria-hidden="true"
                      className="size-3 text-success"
                    />
                  ) : (
                    <ArrowDownRightIcon
                      aria-hidden="true"
                      className="size-3 text-danger"
                    />
                  )}
                  {metric.delta}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[720px]">
              <TableCaption className="px-4 text-left">
                Specimen rows. Totals are formatted at the render boundary from
                integer cents.
              </TableCaption>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Order</TableHead>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col">Payment</TableHead>
                  <TableHead scope="col">Fulfillment</TableHead>
                  <TableHead scope="col" className="text-right">
                    Total
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Placed
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specimenRows.map((row) => (
                  <TableRow key={row.number} className="h-11">
                    <TableCell className="font-mono text-xs">
                      {row.number}
                    </TableCell>
                    <TableCell className="font-medium">{row.customer}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={paymentTone[row.payment]}
                      >
                        {row.payment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={fulfillmentTone[row.fulfillment]}
                      >
                        {row.fulfillment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {row.placed}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="states-title"
        >
          <SectionHeading
            id="states-title"
            title="States and feedback"
            description="Loading, empty, and failure states are designed surfaces, not blanks. Toasts state what changed."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.success("Product saved", {
                      description: "Canvas weekend bag is now active.",
                    })
                  }
                >
                  Success toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.error("Could not save product", {
                      description: "The SKU is already used by another variant.",
                    })
                  }
                >
                  Failure toast
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Bottom-right, bordered, no colored fill. Copy names the object
                and the next step.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Loading</h3>
              <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner />
                  <span role="status">Loading orders</span>
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Skeletons match the final row rhythm. Spinners only for actions
                under one second.
              </p>
            </div>
          </div>

          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No collections yet</EmptyTitle>
              <EmptyDescription>
                Group products into collections to control how the demo catalog
                is browsed.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">
                <PlusIcon aria-hidden="true" />
                Create collection
              </Button>
            </EmptyContent>
          </Empty>
        </section>

        <section
          className="flex flex-col gap-6 border-t border-border pt-10"
          aria-labelledby="icons-title"
        >
          <SectionHeading
            id="icons-title"
            title="Iconography"
            description="Lucide, 1.75 stroke, 18px in navigation and 16px inline. Icons never replace a label unless the label is in the tooltip and aria-label."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {iconSamples.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-3"
              >
                <Icon aria-hidden="true" className="size-[18px]" />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border pt-6">
          <p className="text-xs leading-5 text-muted-foreground">
            CommerceOS design system, Phase 2. This route is excluded from
            navigation and marked noindex. Feature modules, the application
            shell, and Supabase work have not started.
          </p>
        </footer>
      </main>
    </div>
  );
}
