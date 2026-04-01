import { openDB, IDBPDatabase } from 'idb';

export type KeyValueDB = IDBPDatabase<unknown>;

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

export function getDB() {
  if (!dbPromise) {
    // Bump version when adding new object stores
    dbPromise = openDB('gold-crafts-db', 3, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
        if (!db.objectStoreNames.contains('changeQueue')) {
          const store = db.createObjectStore('changeQueue', { keyPath: 'id' });
          store.createIndex('byTable', 'table');
          store.createIndex('byCreated', 'createdAt');
        }
        if (!db.objectStoreNames.contains('calendarEventSync')) {
          db.createObjectStore('calendarEventSync', { keyPath: 'appointmentId' });
        }
        if (!db.objectStoreNames.contains('appointments')) {
          db.createObjectStore('appointments', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// Generic CRUD operations
export async function dbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put(storeName, value);
}

export async function dbGetById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return await db.get(storeName, id);
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return await db.getAll(storeName);
}

export async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

// Key-value specific operations (for backward compatibility)
export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get('keyval', key)) as T | undefined;
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('keyval', value, key);
}

export async function idbDelete(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('keyval', key);
}

export async function idbClear(): Promise<void> {
  const db = await getDB();
  await db.clear('keyval');
}
