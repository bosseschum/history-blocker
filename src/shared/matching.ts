/**
 * Turns whatever the user typed ("https://www.Example.com/path?x=1",
 * "example.com:8080", "  Example.COM ") into a bare hostname.
 * Returns null if the input isn't a usable domain.
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    // The URL parser does the hard work: it strips protocol, path,
    // port, and credentials, and lowercases the hostname.
    const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const hostname = new URL(withScheme).hostname.replace(/\.$/, "");

    // Require at least one dot ("example.com"). This rejects junk like "foo".
    if (!hostname.includes(".")) return null;
    return hostname;
  } catch {
    return null;
  }
}

/**
 * True if the URL's hostname equals a blocked domain or is a subdomain of one.
 * Blocking "example.com" also blocks "www.example.com" and "a.b.example.com",
 * but NOT "notexample.com".
 */
export function isBlocked(url: string, blocklist: readonly string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // History entries also include chrome://, file://, etc. Only match web pages.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname;
  return blocklist.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
