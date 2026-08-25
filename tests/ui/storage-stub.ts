/**
 * In-memory Storage stub for UI tests.
 *
 * Under this vitest/jsdom combination `window.localStorage` arrives as a
 * method-less object (Node's `--localstorage-file` shim without a valid
 * path shadows jsdom's implementation). The app itself is fine — every
 * access goes through src/persist/'s wrapped calls, which surface the
 * failure as the AutosaveWarning — but persistence round-trip tests need a
 * WORKING store, so each test installs this deterministic one.
 */

export interface InstalledStorage {
  storage: Storage;
  /** The backing map, for direct inspection. */
  store: Map<string, string>;
}

export function installMemoryLocalStorage(): InstalledStorage {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return { storage, store };
}
