// js/core/storage.ts
// Storage adapter interface with IndexedDB and localStorage implementations.

export interface SaveSlotMeta {
  id: string;          // 'slot1'..'slot3', 'autosave'
  label: string;
  timestamp: number;
  version: number;
  playerName: string;
  orbexFragments: number;
}

export interface IGameStorage {
  save(slotId: string, data: unknown, meta: SaveSlotMeta): Promise<void>;
  load(slotId: string): Promise<unknown | null>;
  getSlotMeta(slotId: string): Promise<SaveSlotMeta | null>;
  listSlots(): Promise<SaveSlotMeta[]>;
  delete(slotId: string): Promise<void>;
}

// ========== IndexedDB Implementation ==========
const DB_NAME = 'kalgoth-gaze';
const DB_VERSION = 1;
const STORE_NAME = 'saveSlots';

class IndexedDBStorage implements IGameStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  async save(slotId: string, data: unknown, meta: SaveSlotMeta): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: slotId, data, meta });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async load(slotId: string): Promise<unknown | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(slotId);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result ? result.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getSlotMeta(slotId: string): Promise<SaveSlotMeta | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(slotId);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result ? result.meta : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async listSlots(): Promise<SaveSlotMeta[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as any[];
        resolve(items.map(item => item.meta as SaveSlotMeta));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(slotId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ========== LocalStorage Fallback ==========
class LocalStorageFallback implements IGameStorage {
  private prefix = 'kalgoth_save_';

  async save(slotId: string, data: unknown, meta: SaveSlotMeta): Promise<void> {
    localStorage.setItem(this.prefix + slotId, JSON.stringify({ data, meta }));
  }

  async load(slotId: string): Promise<unknown | null> {
    const raw = localStorage.getItem(this.prefix + slotId);
    if (!raw) return null;
    try { return JSON.parse(raw).data; } catch { return null; }
  }

  async getSlotMeta(slotId: string): Promise<SaveSlotMeta | null> {
    const raw = localStorage.getItem(this.prefix + slotId);
    if (!raw) return null;
    try { return JSON.parse(raw).meta; } catch { return null; }
  }

  async listSlots(): Promise<SaveSlotMeta[]> {
    const metas: SaveSlotMeta[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try { metas.push(JSON.parse(raw).meta); } catch {}
        }
      }
    }
    return metas;
  }

  async delete(slotId: string): Promise<void> {
    localStorage.removeItem(this.prefix + slotId);
  }
}

// ========== Factory ==========
let storageInstance: IGameStorage;

export function getStorage(): IGameStorage {
  if (!storageInstance) {
    try {
      // Test IndexedDB availability
      if (typeof indexedDB !== 'undefined') {
        storageInstance = new IndexedDBStorage();
      } else {
        storageInstance = new LocalStorageFallback();
      }
    } catch {
      storageInstance = new LocalStorageFallback();
    }
  }
  return storageInstance;
}
