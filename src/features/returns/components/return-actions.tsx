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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  decideReturn,
  refundReturn,
  requestReturn,
} from "@/features/returns/actions";
import { initialFormState, type FormActionState } from "@/lib/form-state";
import { formatMoney } from "@/lib/format";

export type ReturnableItem = {
  id: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  totalCents: number;
};

export function ReturnRequestDialog({
  orderId,
  orderNumber,
  items,
}: {
  orderId: string;
  orderNumber: string;
  items: ReturnableItem[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");

  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await requestReturn(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not create the return.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Return requested.");
        setOpen(false);
      }
      return result;
    },
    initialFormState
  );

  const payload = items
    .filter((item) => selected[item.id])
    .map((item) => ({
      orderItemId: item.id,
      quantity: quantities[item.id] ?? String(item.quantity),
      restock: restock[item.id] ?? true,
    }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Request return
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request return for {orderNumber}</DialogTitle>
          <DialogDescription>
            Pick the items and quantities. The return starts as requested;
            approval and refund are separate steps.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="itemsJson" value={JSON.stringify(payload)} />
          <input type="hidden" name="reason" value={reason} />

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {items.map((item) => {
              const checked = Boolean(selected[item.id]);
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 border-b border-border px-3 py-2.5 last:border-0"
                >
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id={`return-${item.id}`}
                      checked={checked}
                      onCheckedChange={(value) =>
                        setSelected((current) => ({
                          ...current,
                          [item.id]: value === true,
                        }))
                      }
                    />
                    <label
                      htmlFor={`return-${item.id}`}
                      className="flex min-w-0 flex-1 cursor-pointer flex-col"
                    >
                      <span className="truncate text-sm font-medium">
                        {item.productTitle}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.variantTitle} · {item.sku} · ordered{" "}
                        {item.quantity}
                      </span>
                    </label>
                    <span className="font-mono text-xs tabular-nums">
                      {formatMoney(item.totalCents)}
                    </span>
                  </div>
                  {checked ? (
                    <div className="flex flex-wrap items-end gap-3 pl-7">
                      <Field className="w-24">
                        <FieldLabel htmlFor={`qty-${item.id}`}>
                          Quantity
                        </FieldLabel>
                        <Input
                          id={`qty-${item.id}`}
                          inputMode="numeric"
                          value={quantities[item.id] ?? String(item.quantity)}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="h-8"
                        />
                      </Field>
                      <div className="flex items-center gap-2 pb-1.5">
                        <Checkbox
                          id={`restock-${item.id}`}
                          checked={restock[item.id] ?? true}
                          onCheckedChange={(value) =>
                            setRestock((current) => ({
                              ...current,
                              [item.id]: value === true,
                            }))
                          }
                        />
                        <label
                          htmlFor={`restock-${item.id}`}
                          className="text-xs"
                        >
                          Restock if approved
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Field>
            <FieldLabel htmlFor="return-reason">Reason</FieldLabel>
            <Textarea
              id="return-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Damaged on arrival"
            />
          </Field>

          <FormMessage state={state} />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Requesting" disabled={payload.length === 0}>
              Request return
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useCloseOnSuccess(
  action: (
    state: FormActionState,
    formData: FormData
  ) => Promise<FormActionState>,
  setOpen: (open: boolean) => void
) {
  return useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Action failed.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Saved.");
        setOpen(false);
      }
      return result;
    },
    initialFormState
  );
}

export function ReturnDecisionDialog({
  returnId,
  approve,
}: {
  returnId: string;
  approve: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useCloseOnSuccess(decideReturn, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={approve ? "default" : "outline"} size="sm">
          {approve ? "Approve" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {approve ? "Approve this return?" : "Reject this return?"}
          </DialogTitle>
          <DialogDescription>
            {approve
              ? "Approval allows a refund in a separate step. No stock or money moves yet."
              : "Rejection closes the request. The note is stored for staff."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="returnId" value={returnId} />
          <input type="hidden" name="approve" value={approve ? "true" : "false"} />
          <Field>
            <FieldLabel htmlFor={`return-note-${approve}`}>Note</FieldLabel>
            <Textarea
              id={`return-note-${approve}`}
              name="note"
              rows={2}
              placeholder="Optional decision note"
            />
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton
              pendingLabel={approve ? "Approving" : "Rejecting"}
              variant={approve ? "default" : "destructive"}
            >
              {approve ? "Approve return" : "Reject return"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RefundReturnDialog({
  returnId,
  refundCents,
}: {
  returnId: string;
  refundCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useCloseOnSuccess(refundReturn, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Refund return</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund {formatMoney(refundCents)}</DialogTitle>
          <DialogDescription>
            Creates a completed demo refund and closes the return. The refund
            cannot exceed the order total.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="returnId" value={returnId} />
          <Field orientation="horizontal">
            <Checkbox id="refund-restock" name="restock" defaultChecked />
            <FieldLabel htmlFor="refund-restock">
              Restock eligible items
            </FieldLabel>
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Refunding">Refund return</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
