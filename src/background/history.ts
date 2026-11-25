import { isBlocked } from "../shared/matching";

const MAX_RESULTS = 100_000;

/**
 * Deletes every history entry that belongs to one of the given domains.
 * Returns how many URLs were deleted.
 */
export async function purgeDomains(domains: readonly string[]): Promise<number> {
  if (domains.length === 0) return 0;

  const seen = new Set<string>();
  let deleted = 0;

  for (const domain of domains) {
    // `text` is a loose substring search over URL and title, so it can
    // return false positives. We filter the results with isBlocked(),
    // which does the exact hostname check.
    const items = await chrome.history.search({
      text: domain,
      startTime: 0, // default is only the last 24 hours
      maxResults: MAX_RESULTS,
    });

    for (const item of items) {
      if (!item.url || seen.has(item.url) || !isBlocked(item.url, domains)) continue;
      seen.add(item.url);
      try {
        await chrome.history.deleteUrl({ url: item.url });
        deleted++;
      } catch (error) {
        // The entry may already have been removed by another handler.
        console.warn("[bg] could not delete", item.url, error);
      }
    }
  }

  return deleted;
}

/** Removes one exact URL, ignoring errors from concurrent deletions. */
export async function deleteUrl(url: string): Promise<void> {
  try {
    await chrome.history.deleteUrl({ url });
  } catch (error) {
    console.warn("[bg] could not delete", url, error);
  }
}
