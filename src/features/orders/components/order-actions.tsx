"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { Button } from "@/components/ui/button";
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
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cancelOrder, fulfillOrder, refundOrder } from "@/features/orders/actions";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

export function CancelOrderDialog({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await cancelOrder(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not cancel the order.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Order cancelled.");
        setOpen(false);
      }
      return result;
    },
    initialFormState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Cancel order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {orderNumber}?</DialogTitle>
          <DialogDescription>
            Cancellation is final for this demo order. Reserved stock is released;
            legacy orders without reservations can add their quantities back to
            on-hand stock.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={orderId} />
          <Field orientation="horizontal">
            <Checkbox id="cancel-restock" name="restock" defaultChecked />
            <FieldLabel htmlFor="cancel-restock">
              Restore unfulfilled on-hand stock
            </FieldLabel>
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Keep order
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Cancelling" variant="destructive" size="sm">
              Cancel order
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FulfillOrderDialog({
  orderId,
  orderNumber,
  items,
}: {
  orderId: string;
  orderNumber: string;
  items: Array<{
    id: string;
    productTitle: string;
    variantTitle: string;
    sku: string;
    remaining: number;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await fulfillOrder(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not fulfill the order.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Fulfillment recorded.");
        setOpen(false);
      }
      return result;
    },
    initialFormState
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuantities(
        Object.fromEntries(items.map((item) => [item.id, String(item.remaining)]))
      );
    }
  }

  const payload = items
    .map((item) => ({
      orderItemId: item.id,
      quantity: Number(quantities[item.id] ?? item.remaining),
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Fulfill order</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fulfill {orderNumber}</DialogTitle>
          <DialogDescription>
            Reserved quantities become fulfilled stock. Adjust quantities for a
            partial fulfillment; the remainder stays reserved.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={orderId} />
          <input
            type="hidden"
            name="itemsJson"
            value={JSON.stringify(payload)}
          />
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_6rem] items-end gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {item.productTitle}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.variantTitle} ·{" "}
                    <span className="font-mono">{item.sku}</span> ·{" "}
                    {item.remaining} reserved
                  </span>
                </div>
                <Field>
                  <FieldLabel htmlFor={`fulfill-${item.id}`}>Quantity</FieldLabel>
                  <Input
                    id={`fulfill-${item.id}`}
                    type="number"
                    min={1}
                    max={item.remaining}
                    value={quantities[item.id] ?? String(item.remaining)}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
              </div>
            ))}
          </div>
          <FormMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Fulfilling">
              Record fulfillment
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RefundDialog({
  orderId,
  orderNumber,
  refundableCents,
}: {
  orderId: string;
  orderNumber: string;
  refundableCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await refundOrder(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not record the refund.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Refund recorded.");
        setOpen(false);
      }
      return result;
    },
    initialFormState
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }

  const amountError = fieldError(state, "amount");
  const reasonError = fieldError(state, "reason");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Record refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund {orderNumber}</DialogTitle>
          <DialogDescription>
            Demo bookkeeping only. The refundable remainder is{" "}
            {(refundableCents / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
            . No payment provider is contacted.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <Field data-invalid={Boolean(amountError) || undefined}>
            <FieldLabel htmlFor="refund-amount">Amount (USD)</FieldLabel>
            <Input
              id="refund-amount"
              name="amount"
              inputMode="decimal"
              placeholder="25.00"
              required
              aria-invalid={Boolean(amountError) || undefined}
            />
            {amountError ? (
              <span className="text-xs text-danger">{amountError}</span>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(reasonError) || undefined}>
            <FieldLabel htmlFor="refund-reason">Reason</FieldLabel>
            <Input
              id="refund-reason"
              name="reason"
              placeholder="Damaged item"
              aria-invalid={Boolean(reasonError) || undefined}
            />
            {reasonError ? (
              <span className="text-xs text-danger">{reasonError}</span>
            ) : null}
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Recording">Record refund</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
