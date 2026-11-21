/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OrderForm } from "@/features/orders/components/order-form";
import type { FormActionState } from "@/lib/form-state";

const variants = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productTitle: "Everyday Canvas Tote",
    variantTitle: "Small",
    sku: "UG-001-S",
    priceCents: 5000,
    available: 10,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productTitle: "Everyday Canvas Tote",
    variantTitle: "Medium",
    sku: "UG-001-M",
    priceCents: 5500,
    available: 6,
  },
];

async function idleAction(): Promise<FormActionState> {
  return { status: "idle" };
}

describe("OrderForm", () => {
  it("updates the estimated total when shipping and tax change", async () => {
    const user = userEvent.setup();
    render(
      <OrderForm
        action={idleAction}
        customers={[]}
        variants={variants}
        idempotencyKey="test-order-key"
      />
    );

    await user.clear(screen.getByLabelText("Shipping amount"));
    await user.type(screen.getByLabelText("Shipping amount"), "5.00");
    await user.clear(screen.getByLabelText("Tax amount"));
    await user.type(screen.getByLabelText("Tax amount"), "2.25");

    await waitFor(() => {
      expect(screen.getByText("$7.25")).toBeInTheDocument();
    });
  });

  it("adds and removes line-item rows", async () => {
    const user = userEvent.setup();
    render(
      <OrderForm
        action={idleAction}
        customers={[]}
        variants={variants}
        idempotencyKey="test-order-key"
      />
    );

    const before = screen.getAllByRole("combobox").length;
    await user.click(screen.getByRole("button", { name: /add item/i }));
    expect(screen.getAllByRole("combobox")).toHaveLength(before + 1);

    await user.click(
      screen.getAllByRole("button", { name: /remove line item/i })[0]
    );
    expect(screen.getAllByRole("combobox")).toHaveLength(before);
  });
});
