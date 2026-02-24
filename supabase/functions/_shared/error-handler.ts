/**
 * Generates a unique error ID for tracking
 */
export function generateErrorId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Creates a secure error response that doesn't expose internal details.
 * Logs the full error server-side for debugging.
 */
export function createSecureErrorResponse(
  error: unknown, 
  corsHeaders: Record<string, string>,
  context?: string
): Response {
  const errorId = generateErrorId();
  
  // Log full error details server-side
  console.error(`Error ${errorId}${context ? ` in ${context}` : ''}:`, error);
  
  // Return generic error to client with tracking ID
  return new Response(
    JSON.stringify({ 
      error: 'An error occurred processing your request',
      errorId: errorId
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Creates a secure validation error response
 */
export function createValidationErrorResponse(
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
