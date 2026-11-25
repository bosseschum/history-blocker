import { normalizeDomain } from "./matching";

export const BLOCKLIST_KEY = "blocklist";

/**
 * Storage hands back `unknown`/`any`. Instead of trusting it with a cast,
 * normalize every entry: old versions stored raw input and "www." domains.
 */
export function parseBlocklist(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const domains = new Set<string>();
  for (const entry of value) {
    const domain = typeof entry === "string" ? normalizeDomain(entry) : null;
    if (domain) domains.add(domain.replace(/^www\./, ""));
  }
  return [...domains].sort();
}

export async function getBlocklist(): Promise<string[]> {
  const result = await chrome.storage.sync.get(BLOCKLIST_KEY);
  return parseBlocklist(result[BLOCKLIST_KEY]);
}

async function saveBlocklist(list: string[]): Promise<void> {
  await chrome.storage.sync.set({ [BLOCKLIST_KEY]: list });
}

/** Adds a domain. Returns the normalized domain, or null if the input was invalid. */
export async function addDomain(input: string): Promise<string | null> {
  const domain = normalizeDomain(input);
  if (!domain) return null;

  const normalized = domain.replace(/^www\./, "");

  const list = await getBlocklist();
  if (!list.includes(normalized)) {
    await saveBlocklist([...list, normalized].sort());
  }
  return normalized;
}

export async function removeDomain(domain: string): Promise<void> {
  const list = await getBlocklist();
  await saveBlocklist(list.filter((d) => d !== domain));
}
