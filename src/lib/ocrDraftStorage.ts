const DB_NAME = 'FleetFlow_OCR';
const STORE_NAME = 'ocr_drafts';
const DRAFT_KEY = 'current_draft';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveOCRDraft(images: File[], extractedData: any[]) {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // We don't save the blob urls from extractedData because they expire.
      // We'll just recreate them on load using the saved images array.
      const safeData = extractedData.map(data => ({
        ...data,
        imageUrl: '', // clear it
      }));

      const payload = {
        images, // Array of Files/Blobs which IndexedDB supports natively
        extractedData: safeData,
        timestamp: Date.now()
      };

      const request = store.put(payload, DRAFT_KEY);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save OCR draft to IndexedDB:', error);
  }
}

export async function loadOCRDraft(): Promise<{ images: File[], extractedData: any[] } | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DRAFT_KEY);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Reconstruct Object URLs for the images and map them back to the extracted data
        const { images, extractedData } = result;
        
        // Match the files to the extracted data by fileName
        const restoredData = extractedData.map((data: any) => {
          const matchingImage = images.find((f: File) => f.name === data.fileName);
          return {
            ...data,
            imageUrl: matchingImage ? URL.createObjectURL(matchingImage) : ''
          };
        });

        resolve({ images, extractedData: restoredData });
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load OCR draft from IndexedDB:', error);
    return null;
  }
}

export async function clearOCRDraft(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(DRAFT_KEY);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear OCR draft from IndexedDB:', error);
  }
}
