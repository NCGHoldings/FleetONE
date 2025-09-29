import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const ALLOWED_FILE_TYPES = ['PDF', 'JPG', 'JPEG', 'PNG', 'DOCX'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const accidentId = pathSegments[pathSegments.length - 2]; // /accident-documents/{id}/documents

    if (!accidentId || accidentId === 'accident-documents') {
      throw new Error('Accident ID is required');
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user');
    }

    switch (req.method) {
      case 'GET': {
        // List documents for accident
        const { data, error } = await supabase
          .from('accident_documents')
          .select('*')
          .eq('accident_id', accidentId)
          .order('uploaded_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Generate signed URLs for download
        const documentsWithUrls = await Promise.all(
          data.map(async (doc) => {
            const { data: signedUrl } = await supabase.storage
              .from('documents')
              .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

            return {
              ...doc,
              download_url: signedUrl?.signedUrl
            };
          })
        );

        return new Response(
          JSON.stringify({ documents: documentsWithUrls }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'POST': {
        // Upload document
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          throw new Error('No file provided');
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop()?.toUpperCase();
        if (!fileExtension || !ALLOWED_FILE_TYPES.includes(fileExtension)) {
          throw new Error(`File type ${fileExtension} not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        // Check if accident exists
        const { data: accident, error: accidentError } = await supabase
          .from('accident_records')
          .select('id')
          .eq('id', accidentId)
          .single();

        if (accidentError || !accident) {
          throw new Error('Accident record not found');
        }

        // Generate unique file path
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${timestamp}-${file.name}`;
        const filePath = `accidents/${accidentId}/${fileName}`;

        // Check for existing file with same name (versioning)
        const { data: existingDocs } = await supabase
          .from('accident_documents')
          .select('version')
          .eq('accident_id', accidentId)
          .eq('original_name', file.name)
          .order('version', { ascending: false })
          .limit(1);

        const version = existingDocs && existingDocs.length > 0 ? existingDocs[0].version + 1 : 1;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Save document metadata
        const { data: docData, error: docError } = await supabase
          .from('accident_documents')
          .insert({
            accident_id: accidentId,
            file_name: fileName,
            original_name: file.name,
            file_type: fileExtension,
            file_size: file.size,
            file_path: filePath,
            version: version,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (docError) {
          // Clean up uploaded file if database insert fails
          await supabase.storage.from('documents').remove([filePath]);
          throw docError;
        }

        return new Response(
          JSON.stringify(docData),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201
          }
        );
      }

      case 'DELETE': {
        // Delete document - get documentId from request body
        const body = await req.json();
        const documentId = body.documentId;
        
        if (!documentId) {
          throw new Error('Document ID is required for deletion');
        }

        // Get document info
        const { data: doc, error: docError } = await supabase
          .from('accident_documents')
          .select('*')
          .eq('id', documentId)
          .eq('accident_id', accidentId)
          .single();

        if (docError || !doc) {
          throw new Error('Document not found');
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('accident_documents')
          .delete()
          .eq('id', documentId);

        if (deleteError) {
          throw deleteError;
        }

        return new Response(
          JSON.stringify({ message: 'Document deleted successfully' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      default:
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders 
        });
    }
  } catch (error: unknown) {
    console.error('Error in accident-documents function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});