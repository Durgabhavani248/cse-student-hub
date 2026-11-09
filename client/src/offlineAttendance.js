const DB_NAME = "nri-hub-offline-attendance";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("queue")) {
        const queue = db.createObjectStore("queue", { keyPath: "syncId" });
        queue.createIndex("periodKey", "periodKey", { unique: true });
        queue.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, action) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let request;

    try {
      request = action(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    tx.oncomplete = () => {
      const result = request?.result;
      db.close();
      resolve(result);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Offline storage transaction failed."));
    };

    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Offline storage transaction aborted."));
    };
  });
}

export function makeAttendancePeriodKey(batch) {
  return [
    batch.branch,
    batch.section,
    String(batch.subject || "").trim().toLowerCase(),
    batch.date,
    String(batch.periodId)
  ].join("|");
}

function createSyncId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `attendance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function cacheData(key, value) {
  return withStore("cache", "readwrite", store =>
    store.put({ key, value, updatedAt: Date.now() })
  );
}

export async function readCachedData(key) {
  const result = await withStore("cache", "readonly", store =>
    store.get(key)
  );
  return result?.value ?? null;
}

export async function savePendingAttendance(batch) {
  const periodKey = makeAttendancePeriodKey(batch);

  const record = {
    ...batch,
    syncId: batch.syncId || createSyncId(),
    periodKey,
    status: "pending",
    savedAt: new Date().toISOString()
  };

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const check = store.index("periodKey").get(periodKey);

    let duplicate = false;

    check.onsuccess = () => {
      if (check.result) {
        duplicate = true;
        return;
      }

      store.add(record);
    };

    tx.oncomplete = () => {
      db.close();

      if (duplicate) {
        reject(new Error("Attendance for this period is already saved locally."));
      } else {
        resolve(record);
      }
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Could not save offline attendance."));
    };

    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Offline attendance save was aborted."));
    };
  });
}

export async function getPendingAttendance() {
  const result = await withStore("queue", "readonly", store =>
    store.getAll()
  );
  return (result || []).filter(item => item.status === "pending");
}

export async function getAllAttendanceQueue() {
  const result = await withStore("queue", "readonly", store =>
    store.getAll()
  );
  return result || [];
}

export async function getLocalPeriodAttendance(periodKey) {
  const result = await withStore("queue", "readonly", store =>
    store.index("periodKey").get(periodKey)
  );
  return result || null;
}

export async function updateAttendanceStatus(syncId, status, details = {}) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const request = store.get(syncId);

    request.onsuccess = () => {
      if (!request.result) return;

      store.put({
        ...request.result,
        ...details,
        status,
        updatedAt: new Date().toISOString()
      });
    };

    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Could not update offline attendance status."));
    };

    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Offline attendance status update aborted."));
    };
  });
}

export async function markAttendanceSynced(syncId, serverMessage) {
  return updateAttendanceStatus(syncId, "synced", {
    serverMessage,
    syncedAt: new Date().toISOString()
  });
}
