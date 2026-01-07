/**
 * Validates cron job requests using a shared secret.
 * Use this for all scheduled/cron edge functions to ensure only authorized calls.
 */
export function validateCronSecret(req: Request): { valid: boolean; error?: string } {
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not configured');
    return { valid: false, error: 'Server configuration error' };
  }
  
  const authHeader = req.headers.get('x-cron-secret') || req.headers.get('authorization');
  
  // Support both x-cron-secret header and Bearer token format
  const providedSecret = authHeader?.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '') 
    : authHeader;
  
  if (!providedSecret || providedSecret !== cronSecret) {
    console.warn('Invalid or missing cron secret');
    return { valid: false, error: 'Unauthorized' };
  }
  
  return { valid: true };
}

/**
 * Creates a standard unauthorized response for cron endpoints
 */
export function createUnauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
