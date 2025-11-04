import { openDB, IDBPDatabase } from 'idb';

export type KeyValueDB = IDBPDatabase<unknown>;

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

export function getDB() {
  if (!dbPromise) {
    // Bump version when adding new object stores
    dbPromise = openDB('gold-crafts-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
        if (!db.objectStoreNames.contains('changeQueue')) {
          const store = db.createObjectStore('changeQueue', { keyPath: 'id' });
          store.createIndex('byTable', 'table');
          store.createIndex('byCreated', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const tx = db.transaction('keyval');
  const store = tx.objectStore('keyval');
  return (await store.get(key)) as T | undefined;
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  await store.put(value as unknown as IDBValidKey, key);
  await tx.done;
}

export async function idbDelete(key: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  await store.delete(key);
  await tx.done;
}

export async function idbClear(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  await store.clear();
  await tx.done;
}


