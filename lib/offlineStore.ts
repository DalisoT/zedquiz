const DB_NAME = 'zedquiz';
const DB_VERSION = 1;

interface AttemptStore {
  id?: number;
  question_id: string;
  answer: string;
  user_id: string;
  timestamp: number;
  synced: boolean;
}

interface QuestionCache {
  id: string;
  question_text: string;
  answer_type: 'objective' | 'structured' | 'essay';
  marks: number;
  marking_scheme: { point: string; marks: number }[];
  difficulty_level: 'easy' | 'medium' | 'hard';
  cached_at: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => rej(req.error);
    req.onsuccess = () => res(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('questions')) {
        db.createObjectStore('questions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-attempts')) {
        db.createObjectStore('pending-attempts', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function cacheQuestion(q: QuestionCache): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('questions', 'readwrite');
    tx.objectStore('questions').put({ ...q, cached_at: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getCachedQuestion(id: string): Promise<QuestionCache | null> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('questions', 'readonly');
    const req = tx.objectStore('questions').get(id);
    req.onerror = () => rej(req.error);
    req.onsuccess = () => {
      const r = req.result;
      res(r && Date.now() - r.cached_at > 86400000 ? null : r);
    };
  });
}

export async function queueAttempt(attempt: Omit<AttemptStore, 'id' | 'synced'>): Promise<number> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction('pending-attempts', 'readwrite').objectStore('pending-attempts').add({ ...attempt, synced: false });
    req.onerror = () => rej(req.error);
    req.onsuccess = () => res(req.result as number);
  });
}

export async function syncPendingAttempts(): Promise<{ synced: number; failed: number }> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('pending-attempts', 'readonly');
    const req = tx.objectStore('pending-attempts').getAll();
    req.onerror = () => rej(req.error);
    req.onsuccess = async () => {
      let synced = 0, failed = 0;
      for (const a of req.result) {
        try {
          const r = await fetch('/api/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_id: a.question_id, answer: a.answer, user_id: a.user_id }),
          });
          if (r.ok) {
            db.transaction('pending-attempts', 'readwrite').objectStore('pending-attempts').delete(a.id!);
            synced++;
          } else failed++;
        } catch { failed++; }
      }
      res({ synced, failed });
    };
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnline(cb: () => void): () => void {
  window.addEventListener('online', cb);
  return () => window.removeEventListener('online', cb);
}

export function onOffline(cb: () => void): () => void {
  window.addEventListener('offline', cb);
  return () => window.removeEventListener('offline', cb);
}