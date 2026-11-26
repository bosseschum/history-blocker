type BrowserApi = typeof chrome;

const browserApi = ((globalThis as { browser?: BrowserApi }).browser ?? chrome) as BrowserApi;

export default browserApi;
