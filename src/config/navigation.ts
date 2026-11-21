import {
  BadgePercent,
  Boxes,
  ChartColumn,
  FileText,
  Layers,
  LayoutDashboard,
  Package,
  RotateCcw,
  Settings,
  ShoppingBag,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  summary: string;
  capabilities: readonly string[];
};

export type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

export const navGroups: readonly NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        id: "overview",
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        summary:
          "The operating picture for the store: exceptions first, then revenue, orders, and customer movement.",
        capabilities: [
          "Revenue, orders, customers, and average order value",
          "Sales trend with date-range and previous-period comparison",
          "Top products and categories",
          "Recent orders and low-stock alerts",
        ],
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        id: "products",
        label: "Products",
        href: "/products",
        icon: Package,
        summary:
          "The catalog record for every product, with variants, media, pricing, and inventory.",
        capabilities: [
          "Product create, edit, duplicate, and archive",
          "Variants with SKU, barcode, price, and cost",
          "Product images and descriptions",
          "Search, filters, sorting, and pagination",
        ],
      },
      {
        id: "collections",
        label: "Collections",
        href: "/collections",
        icon: Layers,
        summary:
          "Curated groups of products used to organize the demo catalog.",
        capabilities: [
          "Create and edit collections",
          "Assign and reorder products",
          "Description and collection image",
          "Product counts",
        ],
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/inventory",
        icon: Boxes,
        summary:
          "Stock on hand, reserved, and available at the product-variant level.",
        capabilities: [
          "On-hand, reserved, and available quantities",
          "Low-stock thresholds and alerts",
          "Stock-in and stock-out adjustments",
          "Immutable movement history",
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        id: "orders",
        label: "Orders",
        href: "/orders",
        icon: ShoppingBag,
        summary:
          "Every order with line-item snapshots, payment and fulfillment state, and a timeline.",
        capabilities: [
          "Order list with search and filters",
          "Line items with historical product snapshots",
          "Payment and fulfillment states",
          "Cancellation and timeline",
        ],
      },
      {
        id: "returns",
        label: "Returns",
        href: "/returns",
        icon: RotateCcw,
        summary:
          "Return requests, approval state, restock decisions, and demo refund records.",
        capabilities: [
          "Return requests with reasons",
          "Approve or reject a return",
          "Restock decision per item",
          "Refund records that cannot exceed the refundable amount",
        ],
      },
      {
        id: "discounts",
        label: "Discounts",
        href: "/discounts",
        icon: BadgePercent,
        summary:
          "Store-scoped codes with limits, minimums, and usage history.",
        capabilities: [
          "Percentage and fixed-amount codes",
          "Minimum purchase and usage limits",
          "Expiration and active state",
          "Redemption history",
        ],
      },
    ],
  },
  {
    label: "Relationships",
    items: [
      {
        id: "customers",
        label: "Customers",
        href: "/customers",
        icon: Users,
        summary:
          "Customer profiles with addresses, order history, lifetime value, and notes.",
        capabilities: [
          "Profile, addresses, and tags",
          "Order history, spend, and average order value",
          "New and returning classification",
          "Internal notes",
        ],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        icon: ChartColumn,
        summary:
          "Revenue, orders, and product performance over a chosen date range.",
        capabilities: [
          "Revenue and order trends",
          "Average order value and gross profit where cost data exists",
          "Product and category performance",
          "Date range and period comparison",
        ],
      },
      {
        id: "reports",
        label: "Reports",
        href: "/reports",
        icon: FileText,
        summary:
          "Saved operational reports with consistent definitions and CSV export.",
        capabilities: [
          "Report definitions stated in the interface",
          "Date-range selection",
          "CSV export of the underlying rows",
          "No figures without a documented formula",
        ],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        id: "team",
        label: "Team",
        href: "/team",
        icon: UsersRound,
        summary:
          "Store memberships, invitations, roles, and the activity log.",
        capabilities: [
          "Invitations with expiry",
          "Owner, admin, manager, and staff roles",
          "Permission changes enforced server-side",
          "Activity log of sensitive actions",
        ],
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: Settings,
        summary:
          "Store profile, currency and timezone, personal preferences, and security.",
        capabilities: [
          "Store profile and logo",
          "Currency and timezone",
          "Profile, password, and notifications",
          "Theme preference",
        ],
      },
    ],
  },
];

export const navItems: readonly NavItem[] = navGroups.flatMap(
  (group) => group.items
);

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}

export function findNavGroup(pathname: string): NavGroup | undefined {
  return navGroups.find((group) =>
    group.items.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  );
}
