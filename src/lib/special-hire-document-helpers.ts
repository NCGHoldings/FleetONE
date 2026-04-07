/**
 * Shared helper for consistent Special Hire document labeling.
 * Single source of truth: advance → "Sales Receipt", balance/full → "Invoice".
 */

export function getDocumentLabel(doc: { document_type?: string; payment_type?: string }): string {
  if (doc.payment_type === 'advance') return 'Sales Receipt';
  if (doc.payment_type === 'balance') return 'Final Balance Invoice';
  if (doc.payment_type === 'full') return 'Full Payment Invoice';
  // Fallback based on document_type
  if (doc.document_type === 'sales_receipt') return 'Sales Receipt';
  if (doc.document_type === 'invoice') return 'Invoice';
  return 'Document';
}

/**
 * Short label for workflow indicators.
 */
export function getDocumentShortLabel(doc: { document_type?: string; payment_type?: string }): string {
  if (doc.payment_type === 'advance') return 'Sales Receipt';
  if (doc.payment_type === 'balance' || doc.payment_type === 'full') return 'Invoice';
  if (doc.document_type === 'sales_receipt') return 'Sales Receipt';
  return 'Invoice';
}
