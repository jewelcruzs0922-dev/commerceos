/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoButton } from "@/features/auth/components/demo-button";
import { startDemo } from "@/features/auth/actions";

vi.mock("@/features/auth/actions", () => ({
  startDemo: vi.fn(),
}));

const startDemoMock = vi.mocked(startDemo);

describe("DemoButton", () => {
  beforeEach(() => {
    startDemoMock.mockReset();
  });

  it("labels the read-only guest scope", () => {
    render(<DemoButton />);

    expect(
      screen.getByRole("button", { name: /try the read-only demo/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no sign-up, card, email, or payment/i)
    ).toBeInTheDocument();
  });

  it("surfaces a demo start failure without navigating", async () => {
    startDemoMock.mockResolvedValue({
      status: "error",
      message: "The demo store is not ready yet.",
    });
    const user = userEvent.setup();
    render(<DemoButton />);

    await user.click(
      screen.getByRole("button", { name: /try the read-only demo/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The demo store is not ready yet."
      );
    });
    expect(startDemoMock).toHaveBeenCalledOnce();
  });
});
