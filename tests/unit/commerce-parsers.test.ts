import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents } from "@/lib/money";
import { csvCell, toCsv } from "@/lib/csv";
import { parseProductIds } from "@/features/collections/schemas";
import { refundOrderSchema } from "@/features/orders/schemas";

describe("money parsing", () => {
  it("parses dollars into integer cents", () => {
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("$0.5")).toBe(50);
    expect(dollarsToCents("12")).toBe(1200);
    expect(dollarsToCents("0.01")).toBe(1);
  });

  it("rejects invalid amounts", () => {
    expect(dollarsToCents("-1")).toBeNull();
    expect(dollarsToCents("1.999")).toBeNull();
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents(null)).toBeNull();
  });

  it("formats cents for form inputs", () => {
    expect(centsToDollars(1999)).toBe("19.99");
    expect(centsToDollars(0)).toBe("0.00");
  });
});

describe("CSV encoding", () => {
  it("quotes cells with commas, quotes, or newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe("");
  });

  it("builds CRLF rows", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("a,b\r\n1,2\r\n");
  });
});

describe("boundary parsers", () => {
  it("keeps only string collection product ids", () => {
    expect(parseProductIds('["a","b",2,null]')).toEqual(["a", "b"]);
    expect(parseProductIds("not-json")).toEqual([]);
    expect(parseProductIds(null)).toEqual([]);
  });

  it("converts refund amounts to cents", () => {
    const parsed = refundOrderSchema.safeParse({
      orderId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "refund-key-1",
      amount: "12.34",
      reason: "Damaged",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(1234);
    }
  });

  it("rejects zero refunds", () => {
    const parsed = refundOrderSchema.safeParse({
      orderId: "11111111-1111-4111-8111-111111111111",
      amount: "0.00",
    });
    expect(parsed.success).toBe(false);
  });
});
