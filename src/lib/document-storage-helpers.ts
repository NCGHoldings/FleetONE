import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'generated-documents';

/**
 * Upload a PDF blob to Supabase Storage and return the storage path.
 */
export async function uploadPdfToStorage(
  pdfBlob: Blob,
  fileName: string
): Promise<{ storagePath: string; fileSize: number }> {
  const storagePath = `documents/${Date.now()}-${fileName}`;
  
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload PDF to storage: ${error.message}`);
  }

  return { storagePath, fileSize: pdfBlob.size };
}

/**
 * Get a public URL for a document stored in the bucket.
 */
export function getDocumentPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Download a PDF from storage and return as base64 (for email sending etc.)
 */
export async function getDocumentAsBase64(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Failed to download document: ${error?.message}`);
  
  const arrayBuffer = await data.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let base64String = '';
  const chunkSize = 1024;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64String += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(base64String);
}

/**
 * Convert a Blob to base64 string (for backward compatibility).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let base64String = '';
  const chunkSize = 1024;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64String += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(base64String);
}

/**
 * Delete a document from storage.
 */
export async function deleteDocumentFromStorage(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.error('Failed to delete document from storage:', error);
  }
}
