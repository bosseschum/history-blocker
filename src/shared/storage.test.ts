import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLOCKLIST_KEY, addDomain, getBlocklist, parseBlocklist, removeDomain } from "./storage";

const { store } = vi.hoisted(() => {
  const store = new Map<string, unknown>();

  vi.stubGlobal("browser", {
    storage: {
      sync: {
        get: vi.fn(async (key: string) => ({ [key]: store.get(key) })),
        set: vi.fn(async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) store.set(key, value);
        }),
      },
    },
  });

  return { store };
});

beforeEach(() => {
  store.clear();
});

describe("parseBlocklist", () => {
  it("returns an empty list for invalid storage data", () => {
    expect(parseBlocklist(undefined)).toEqual([]);
    expect(parseBlocklist("example.com")).toEqual([]);
    expect(parseBlocklist([null, 42, "not a domain", "localhost"])).toEqual([]);
  });

  it("normalizes, deduplicates, and sorts entries", () => {
    expect(parseBlocklist(["https://WWW.Example.com/path", "example.com", "a.org"])).toEqual([
      "a.org",
      "example.com",
    ]);
  });
});

describe("blocklist storage", () => {
  it("stores normalized domains without redundant www entries", async () => {
    expect(await addDomain("https://www.Example.com/a")).toBe("example.com");
    expect(await getBlocklist()).toEqual(["example.com"]);
    expect(await addDomain("example.com")).toBe("example.com");
    expect(await getBlocklist()).toEqual(["example.com"]);
  });

  it("returns null without writing for invalid input", async () => {
    expect(await addDomain("localhost")).toBeNull();
    expect(store.has(BLOCKLIST_KEY)).toBe(false);
  });

  it("removes domains", async () => {
    await addDomain("a.org");
    await addDomain("example.com");
    await removeDomain("a.org");
    expect(await getBlocklist()).toEqual(["example.com"]);
  });
});
