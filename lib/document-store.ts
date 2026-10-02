const DB_NAME = "docuflow-db";
const STORE_NAME = "documents";
const DB_VERSION = 1;

interface StoredDocument {
  id: string;
  file: Blob;
  name: string;
  type: string;
  lastModified: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB."));
    };
  });
}

export async function saveDocumentFile(
  id: string,
  file: File
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const document: StoredDocument = {
      id,
      file,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    };

    store.put(document);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ||
          new Error("Failed to save document.")
      );
    };
  });
}

export async function getDocumentFile(
  id: string
): Promise<File | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      db.close();

      const stored = request.result as StoredDocument | undefined;

      if (!stored) {
        resolve(null);
        return;
      }

      const file = new File([stored.file], stored.name, {
        type: stored.type,
        lastModified: stored.lastModified,
      });

      resolve(file);
    };

    request.onerror = () => {
      db.close();
      reject(
        request.error ||
          new Error("Failed to retrieve document.")
      );
    };
  });
}

/**
 * Get all stored document files.
 * Used by the dashboard to restore uploaded files after refresh.
 */
export async function getAllDocumentFiles(): Promise<
  Array<{ id: string; file: File }>
> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      db.close();

      const storedDocuments =
        request.result as StoredDocument[];

      const files = storedDocuments.map((stored) => ({
        id: stored.id,
        file: new File([stored.file], stored.name, {
          type: stored.type,
          lastModified: stored.lastModified,
        }),
      }));

      resolve(files);
    };

    request.onerror = () => {
      db.close();
      reject(
        request.error ||
          new Error("Failed to retrieve documents.")
      );
    };
  });
}

export async function removeDocumentFile(
  id: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ||
          new Error("Failed to remove document.")
      );
    };
  });
}

export async function renameDocumentFile(
  id: string,
  newName: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      const stored = request.result as StoredDocument | undefined;

      if (!stored) {
        return;
      }

      stored.name = newName;
      stored.file = new File([stored.file], newName, {
        type: stored.type,
        lastModified: stored.lastModified,
      });

      store.put(stored);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error("Failed to rename document.")
      );
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ||
          new Error("Failed to rename document.")
      );
    };
  });
}

export async function hasDocumentFile(
  id: string
): Promise<boolean> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getKey(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result !== undefined);
    };

    request.onerror = () => {
      db.close();
      reject(
        request.error ||
          new Error("Failed to check document.")
      );
    };
  });
}

export async function clearDocumentFiles(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ||
          new Error("Failed to clear documents.")
      );
    };
  });
}