import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCollection, deleteCollection, updateCollection } from "@/features/collections/actions";
import { updateCustomer } from "@/features/customers/actions";
import {
  createDiscount,
  setDiscountActive,
  updateDiscount,
} from "@/features/discounts/actions";
import { adjustStock } from "@/features/inventory/actions";
import {
  cancelOrder,
  createOrder,
  fulfillOrder,
  refundOrder,
} from "@/features/orders/actions";
import {
  createProduct,
  deleteProduct,
  duplicateProduct,
  setProductStatus,
  updateProduct,
} from "@/features/products/actions";
import {
  decideReturn,
  refundReturn,
  requestReturn,
} from "@/features/returns/actions";
import {
  resetDemoData,
  updateStoreSettings,
} from "@/features/settings/actions";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  revokeInvitation,
} from "@/features/team/actions";

const viewer = vi.hoisted(() => ({
  user: { id: "22222222-2222-4222-8222-222222222222" },
  membership: {
    role: "viewer",
    storeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    storeName: "Urban Goods",
    storeTimezone: "America/New_York",
    storeCurrency: "USD",
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthContext: vi.fn(async () => viewer),
  requireMemberContext: vi.fn(async () => viewer),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => {
    throw new Error("A viewer Server Action reached the database");
  }),
}));

const state = { status: "idle" as const };
const form = () => new FormData();

async function expectForbidden(
  run: () => Promise<{ status: string; message?: string }>
) {
  const result = await run();
  expect(result.status).toBe("error");
  expect(result.message).toMatch(/permission/i);
}

describe("viewer Server Action authorization", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "true");
  });

  it.each([
    ["createCollection", () => createCollection(state, form())],
    ["updateCollection", () => updateCollection(state, form())],
    ["deleteCollection", () => deleteCollection(state, form())],
    ["updateCustomer", () => updateCustomer(state, form())],
    ["createDiscount", () => createDiscount(state, form())],
    ["updateDiscount", () => updateDiscount(state, form())],
    ["setDiscountActive", () => setDiscountActive(state, form())],
    ["adjustStock", () => adjustStock(state, form())],
    ["createOrder", () => createOrder(state, form())],
    ["fulfillOrder", () => fulfillOrder(state, form())],
    ["cancelOrder", () => cancelOrder(state, form())],
    ["refundOrder", () => refundOrder(state, form())],
    ["createProduct", () => createProduct(state, form())],
    ["updateProduct", () => updateProduct(state, form())],
    ["setProductStatus", () => setProductStatus(state, form())],
    ["deleteProduct", () => deleteProduct(state, form())],
    ["duplicateProduct", () => duplicateProduct(state, form())],
    ["requestReturn", () => requestReturn(state, form())],
    ["decideReturn", () => decideReturn(state, form())],
    ["refundReturn", () => refundReturn(state, form())],
    ["updateStoreSettings", () => updateStoreSettings(state, form())],
    ["resetDemoData", () => resetDemoData()],
    ["inviteMember", () => inviteMember(state, form())],
    ["revokeInvitation", () => revokeInvitation(state, form())],
    ["changeMemberRole", () => changeMemberRole(state, form())],
    ["removeMember", () => removeMember(state, form())],
  ])("%s is denied before touching data", async (_name, run) => {
    await expectForbidden(run);
  });
});
