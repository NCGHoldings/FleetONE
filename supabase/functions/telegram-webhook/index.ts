import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8660316551:AAHicQGDzncnbcTgvcL8vTHbcjKTn5R_Hfs';
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured')
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const update = await req.json()
    console.log('Received Telegram Update:', JSON.stringify(update))

    // We only care about messages with photos
    if (update.message && update.message.photo) {
      const chatId = update.message.chat.id.toString()
      
      // OPTIONAL: Filter by specific chat ID if needed
      // const TARGET_CHAT_ID = "-5234926117";
      // if (chatId !== TARGET_CHAT_ID) {
      //   console.log(`Ignored message from chat ${chatId}`)
      //   return new Response(JSON.stringify({ status: 'ignored_chat' }), {
      //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      //     status: 200,
      //   })
      // }

      const messageId = update.message.message_id.toString()
      const senderName = update.message.from?.first_name || update.message.from?.username || 'Unknown'
      
      // Get the highest resolution photo (last in the array)
      const photo = update.message.photo[update.message.photo.length - 1]
      const fileId = photo.file_id

      // 1. Get file path from Telegram API
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`)
      const fileInfo = await fileInfoRes.json()
      
      if (!fileInfo.ok) {
        throw new Error(`Failed to get file info from Telegram: ${JSON.stringify(fileInfo)}`)
      }

      const filePath = fileInfo.result.file_path
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`

      // 2. Download the actual image
      const imageRes = await fetch(fileUrl)
      const imageBlob = await imageRes.blob()

      // 3. Upload to Supabase Storage
      const extension = filePath.split('.').pop() || 'jpg'
      const storagePath = `${chatId}/${messageId}_${Date.now()}.${extension}`
      
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('telegram-images')
        .upload(storagePath, imageBlob, {
          contentType: `image/${extension}`,
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Failed to upload to storage: ${uploadError.message}`)
      }

      // 4. Get public URL
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('telegram-images')
        .getPublicUrl(storagePath)

      // 5. Insert record into database
      const { error: dbError } = await supabaseClient
        .from('telegram_receipts')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          sender_name: senderName,
          image_url: publicUrl,
          storage_path: storagePath,
          status: 'pending'
        })

      if (dbError) {
        throw new Error(`Failed to insert record: ${dbError.message}`)
      }

      console.log(`Successfully processed image for message ${messageId}`)
    }

    // Always return 200 OK to Telegram so it doesn't retry
    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    // Return 200 even on error so Telegram doesn't retry indefinitely
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
