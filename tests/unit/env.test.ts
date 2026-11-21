import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function setConfig(url: string | undefined, key: string | undefined) {
  if (url === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  }
  if (key === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
  }
}

afterEach(() => {
  for (const key of KEYS) {
    delete process.env[key];
  }
});

const KEY = "a".repeat(40);

describe("Supabase public config", () => {
  it("returns null when unset", () => {
    setConfig(undefined, undefined);
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("accepts https URLs", () => {
    setConfig("https://project.supabase.co", KEY);
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://project.supabase.co",
      key: KEY,
    });
  });

  it("accepts local http URLs", () => {
    setConfig("http://127.0.0.1:54321", KEY);
    expect(getSupabasePublicConfig()?.url).toBe("http://127.0.0.1:54321");
  });

  it("rejects non-local http URLs", () => {
    setConfig("http://project.supabase.co", KEY);
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("rejects short keys", () => {
    setConfig("https://project.supabase.co", "short");
    expect(getSupabasePublicConfig()).toBeNull();
  });
});
