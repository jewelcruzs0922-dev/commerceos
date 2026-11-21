import type { Database } from "@/types/database";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export const MEMBER_ROLES = [
  "owner",
  "admin",
  "manager",
  "staff",
  "viewer",
] as const satisfies readonly MemberRole[];

const CAPABILITIES = {
  "data:read": ["owner", "admin", "manager", "staff", "viewer"],
  "products:manage": ["owner", "admin", "manager"],
  "collections:manage": ["owner", "admin", "manager"],
  "inventory:adjust": ["owner", "admin", "manager", "staff"],
  "orders:read": ["owner", "admin", "manager", "staff", "viewer"],
  "orders:manage": ["owner", "admin", "manager"],
  "orders:fulfill": ["owner", "admin", "manager", "staff"],
  "customers:read": ["owner", "admin", "manager", "staff", "viewer"],
  "customers:manage": ["owner", "admin", "manager"],
  "analytics:read": ["owner", "admin", "manager", "viewer"],
  "discounts:manage": ["owner", "admin", "manager"],
  "returns:manage": ["owner", "admin", "manager"],
  "team:manage": ["owner", "admin"],
  "settings:manage": ["owner", "admin"],
  "ownership:transfer": ["owner"],
  "store:delete": ["owner"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer",
};

export function isMemberRole(value: unknown): value is MemberRole {
  return (
    typeof value === "string" &&
    (MEMBER_ROLES as readonly string[]).includes(value)
  );
}

export function can(role: MemberRole, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly MemberRole[]).includes(role);
}

export class AuthorizationError extends Error {
  constructor(public readonly capability: Capability) {
    super(`Missing capability: ${capability}`);
    this.name = "AuthorizationError";
  }
}

export function assertCapability(
  role: MemberRole,
  capability: Capability
): void {
  if (!can(role, capability)) {
    throw new AuthorizationError(capability);
  }
}
