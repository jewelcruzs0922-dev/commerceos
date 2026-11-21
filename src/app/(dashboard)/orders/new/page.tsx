import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/features/orders/components/order-form";
import { createOrder } from "@/features/orders/actions";
import { getOrderFormOptions } from "@/features/orders/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "New order",
};

export default async function NewOrderPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="New order"
        description="Create an internal order with line items, a customer, and demo payment bookkeeping."
      />
    );
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "orders:manage")) {
    return <PermissionDenied />;
  }

  const options = await getOrderFormOptions(context.membership.storeId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New order"
        description="Record an internal order. Stock is reserved on creation; fulfillment decrements on-hand stock."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/orders">
              <ArrowLeftIcon aria-hidden="true" />
              Orders
            </Link>
          </Button>
        }
      />

      {options.variants.length === 0 ? (
        <EmptyList
          title="No sellable variants"
          description="Add an active product with a variant and available stock before creating an order."
          action={
            <Button asChild size="sm">
              <Link href="/products/new">New product</Link>
            </Button>
          }
        />
      ) : (
        <OrderForm
          action={createOrder}
          customers={options.customers}
          variants={options.variants}
          idempotencyKey={crypto.randomUUID()}
        />
      )}
    </div>
  );
}
