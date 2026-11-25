import { normalizeDomain } from "../shared/matching";
import { BLOCKLIST_KEY, addDomain, getBlocklist, removeDomain } from "../shared/storage";

// Small helper: look up an element or fail loudly if the HTML and the
// script ever drift apart.
function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const form = $<HTMLFormElement>("add-form");
const input = $<HTMLInputElement>("domain-input");
const message = $<HTMLParagraphElement>("message");
const listEl = $<HTMLUListElement>("blocklist");
const emptyEl = $<HTMLParagraphElement>("empty");
const currentBtn = $<HTMLButtonElement>("block-current");

// The domain of the tab the popup was opened on (null if not blockable).
let currentDomain: string | null = null;

function showMessage(text: string, isError = false): void {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

// --- Rendering -------------------------------------------------------
// The storage is the single source of truth. Every change (from this
// popup, from the service worker, from another synced device) ends up
// in storage, fires onChanged, and re-renders the list from scratch.

async function render(): Promise<void> {
  const domains = await getBlocklist();

  emptyEl.hidden = domains.length > 0;
  listEl.replaceChildren(
    ...domains.map((domain) => {
      const li = document.createElement("li");

      // textContent (not innerHTML): domain names are data, never markup.
      const name = document.createElement("span");
      name.textContent = domain;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${domain}`);
      remove.addEventListener("click", () => void removeDomain(domain));

      li.append(name, remove);
      return li;
    }),
  );

  updateCurrentButton(domains);
}

function updateCurrentButton(domains: readonly string[]): void {
  if (!currentDomain) {
    currentBtn.textContent = "Can't block this page";
    currentBtn.disabled = true;
  } else if (domains.includes(currentDomain)) {
    currentBtn.textContent = `${currentDomain} is blocked`;
    currentBtn.disabled = true;
  } else {
    currentBtn.textContent = `Block ${currentDomain}`;
    currentBtn.disabled = false;
  }
}

// --- Current tab -----------------------------------------------------

async function loadCurrentDomain(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // tab.url is only readable thanks to the "activeTab" permission,
  // which Chrome grants when the user opens the popup.
  const domain = tab?.url ? normalizeDomain(tab.url) : null;

  currentDomain = domain;
}

// --- Events ----------------------------------------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser's default form navigation

  const domain = await addDomain(input.value);
  if (domain) {
    showMessage(`Blocked ${domain}`);
    input.value = "";
  } else {
    showMessage("That doesn't look like a valid domain.", true);
  }
});

currentBtn.addEventListener("click", async () => {
  if (!currentDomain) return;
  await addDomain(currentDomain);
  showMessage(`Blocked ${currentDomain}`);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[BLOCKLIST_KEY]) void render();
});

// --- Start -----------------------------------------------------------

await loadCurrentDomain();
await render();
