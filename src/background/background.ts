import browser from "../shared/browser";
import { isBlocked } from "../shared/matching";
import { BLOCKLIST_KEY, getBlocklist, parseBlocklist } from "../shared/storage";
import { deleteUrl, purgeDomains } from "./history";

// IMPORTANT: all listeners are registered at the top level, synchronously.
// When the browser wakes the background context for an event, it re-runs
// this file and only delivers the event to listeners that exist by the time
// the top-level code finishes. A listener registered later (e.g. inside a
// promise callback) would miss the event that woke the background context.

let purgeQueue: Promise<void> = Promise.resolve();

function queuePurge(domains: readonly string[]): void {
  if (domains.length === 0) return;
  purgeQueue = purgeQueue
    .then(async () => {
      const count = await purgeDomains(domains);
      console.log(`[bg] purged ${count} entries for:`, domains.join(", "));
    })
    .catch((error) => console.error("[bg] purge failed", error));
}

function queueDelete(url: string): void {
  purgeQueue = purgeQueue
    .then(async () => {
      await deleteUrl(url);
      console.log("[bg] removed:", url);
    })
    .catch((error) => console.error("[bg] delete failed", error));
}

// 1) A page was visited: delete it if its domain is blocked.
// The listener itself must stay synchronous so the background context is not
// suspended before the deletion is scheduled. All async work is queued.
browser.history.onVisited.addListener((item) => {
  if (!item.url) return;

  // Read from storage every time. The background context may have just
  // woken up, so we can't rely on a variable holding the list.
  void getBlocklist().then((blocklist) => {
    if (isBlocked(item.url!, blocklist)) {
      queueDelete(item.url!);
    }
  });
});

// 2) The blocklist changed: purge already-recorded entries for new domains.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes[BLOCKLIST_KEY]) return;

  const oldList = parseBlocklist(changes[BLOCKLIST_KEY].oldValue);
  const newList = parseBlocklist(changes[BLOCKLIST_KEY].newValue);
  queuePurge(newList.filter((domain) => !oldList.includes(domain)));
});

// 3) Installed or updated: sweep once for everything on the current list.
browser.runtime.onInstalled.addListener(async () => {
  const list = await getBlocklist();
  queuePurge(list);
});

// 4) Background context restarted (e.g. after suspension): make sure entries
// that appeared while it was asleep are still removed.
void (async () => {
  queuePurge(await getBlocklist());
})();

console.log("[bg] background started at", new Date().toLocaleTimeString());
