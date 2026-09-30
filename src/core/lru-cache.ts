/** A bounded cache that forgets its least recently used entry once `limit` is passed. */
export interface LruCache<T> {
  read: (key: string) => T | undefined;
  write: (key: string, value: T) => void;
  size: () => number;
}

function withEntryLast<T>(entries: ReadonlyMap<string, T>, key: string, value: T): ReadonlyMap<string, T> {
  return new Map([...entries].filter(([entryKey]) => entryKey !== key).concat([[key, value]]));
}

function withinLimit<T>(entries: ReadonlyMap<string, T>, limit: number): ReadonlyMap<string, T> {
  return entries.size <= limit ? entries : new Map([...entries].slice(entries.size - limit));
}

/** Creates a least-recently-used cache holding at most `limit` entries. */
export function createLruCache<T>(limit: number): LruCache<T> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`flickering-dots cache: limit must be a whole number above 0, got ${String(limit)}`);
  }
  let entries: ReadonlyMap<string, T> = new Map();
  return {
    read: (key) => {
      const value = entries.get(key);
      if (value !== undefined) entries = withEntryLast(entries, key, value);
      return value;
    },
    write: (key, value) => {
      entries = withinLimit(withEntryLast(entries, key, value), limit);
    },
    size: () => entries.size,
  };
}
