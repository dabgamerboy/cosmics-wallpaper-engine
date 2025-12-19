
import { Wallpaper } from '../types';
import { logger } from './logService';

const DB_NAME = 'CosmicWallpaperDB';
const DB_VERSION = 2; // Incremented version to add prompt history
const STORES = {
  LIBRARY: 'library',
  HISTORY: 'history',
  PROMPT_HISTORY: 'prompt_history'
};

const SOURCE = "Database";

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    logger.debug(SOURCE, `Opening IndexedDB: ${DB_NAME} (v${DB_VERSION})`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error(SOURCE, "Failed to open database", request.error);
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      logger.info(SOURCE, "Upgrading database schema");
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.LIBRARY)) {
        db.createObjectStore(STORES.LIBRARY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PROMPT_HISTORY)) {
        db.createObjectStore(STORES.PROMPT_HISTORY, { keyPath: 'id' });
      }
    };
  });
};

export const getAllWallpapers = async (storeName: string): Promise<Wallpaper[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = request.result as Wallpaper[];
      logger.debug(SOURCE, `Fetched ${result.length} items from ${storeName}`);
      resolve(result.sort((a, b) => b.timestamp - a.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveWallpaper = async (storeName: string, wallpaper: Wallpaper): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(wallpaper);

    request.onsuccess = () => {
      logger.debug(SOURCE, `Saved item ${wallpaper.id} to ${storeName}`);
      resolve();
    };
    request.onerror = () => {
      logger.error(SOURCE, `Failed to save item to ${storeName}`, request.error);
      reject(request.error);
    };
  });
};

export const deleteWallpaper = async (storeName: string, id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      logger.debug(SOURCE, `Deleted item ${id} from ${storeName}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearStore = async (storeName: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => {
      logger.info(SOURCE, `Cleared all data from ${storeName}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const bulkSaveWallpapers = async (storeName: string, wallpapers: Wallpaper[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    wallpapers.forEach(wp => store.put(wp));

    transaction.oncomplete = () => {
      logger.info(SOURCE, `Bulk save successful: ${wallpapers.length} items to ${storeName}`);
      resolve();
    };
    transaction.onerror = () => {
      logger.error(SOURCE, `Bulk save failed for ${storeName}`, transaction.error);
      reject(transaction.error);
    };
  });
};

export const getPromptHistory = async (): Promise<string[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROMPT_HISTORY, 'readonly');
    const store = transaction.objectStore(STORES.PROMPT_HISTORY);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = request.result as { id: string, timestamp: number }[];
      resolve(result.sort((a, b) => b.timestamp - a.timestamp).map(r => r.id));
    };
    request.onerror = () => reject(request.error);
  });
};

export const addPromptToHistory = async (prompt: string): Promise<void> => {
  if (!prompt.trim()) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROMPT_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORES.PROMPT_HISTORY);
    const request = store.put({ id: prompt, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearPromptHistory = async (): Promise<void> => {
  await clearStore(STORES.PROMPT_HISTORY);
};
