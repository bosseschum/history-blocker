import { describe, expect, it } from "vitest";
import { isBlocked, normalizeDomain } from "./matching";

describe("normalizeDomain", () => {
  it("accepts a plain domain", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });

  it("strips protocol, path, query, and port", () => {
    expect(normalizeDomain("https://example.com/a/b?x=1")).toBe("example.com");
    expect(normalizeDomain("example.com:8080/page")).toBe("example.com");
  });

  it("lowercases and trims", () => {
    expect(normalizeDomain("  Example.COM ")).toBe("example.com");
  });

  it("keeps www if the user typed it", () => {
    expect(normalizeDomain("www.example.com")).toBe("www.example.com");
  });

  it("rejects invalid input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("not a domain")).toBeNull();
  });
});

describe("isBlocked", () => {
  const list = ["example.com", "news.example.org"];

  it("matches the exact domain", () => {
    expect(isBlocked("https://example.com/page", list)).toBe(true);
  });

  it("matches subdomains", () => {
    expect(isBlocked("https://www.example.com/", list)).toBe(true);
    expect(isBlocked("https://a.b.example.com/", list)).toBe(true);
  });

  it("does not match lookalike domains", () => {
    expect(isBlocked("https://notexample.com/", list)).toBe(false);
    expect(isBlocked("https://example.com.evil.net/", list)).toBe(false);
  });

  it("only blocks the listed subdomain, not its parent", () => {
    expect(isBlocked("https://news.example.org/", list)).toBe(true);
    expect(isBlocked("https://example.org/", list)).toBe(false);
  });

  it("ignores non-web URLs and garbage", () => {
    expect(isBlocked("chrome://extensions", list)).toBe(false);
    expect(isBlocked("not a url", list)).toBe(false);
  });

  it("handles an empty blocklist", () => {
    expect(isBlocked("https://example.com", [])).toBe(false);
  });
});
