const TELEGRAM_BOT_TOKEN = "8660316551:AAHicQGDzncnbcTgvcL8vTHbcjKTn5R_Hfs";
const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";
const TARGET_CHAT_ID = "-5234926117";

let lastUpdateId = 0;

async function pollTelegram() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        
        if (update.message && update.message.photo) {
          const chatId = update.message.chat.id.toString();
          
          if (chatId !== TARGET_CHAT_ID) {
            console.log(`[Telegram] Ignored photo from chat ${chatId}`);
            continue;
          }

          const messageId = update.message.message_id.toString();
          const senderName = update.message.from?.first_name || update.message.from?.username || 'Unknown';
          
          console.log(`[Telegram] Processing photo from ${senderName}...`);

          // Get highest resolution photo
          const photo = update.message.photo[update.message.photo.length - 1];
          const fileId = photo.file_id;

          // 1. Get file path
          const fileInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileInfo = await fileInfoRes.json();
          
          if (!fileInfo.ok) {
            console.error(`[Telegram] Failed to get file info:`, fileInfo);
            continue;
          }

          const filePath = fileInfo.result.file_path;
          const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

          // 2. Download image
          const imageRes = await fetch(fileUrl);
          const imageBlob = await imageRes.blob();

          // 3. Upload to Supabase Storage
          const extension = filePath.split('.').pop() || 'jpg';
          const storagePath = `${chatId}/${messageId}_${Date.now()}.${extension}`;
          
          const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/telegram-images/${storagePath}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': `image/${extension}`
            },
            body: imageBlob
          });

          if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            console.error(`[Telegram] Failed to upload to Supabase storage:`, errorText);
            continue;
          }

          // 4. Get public URL
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/telegram-images/${storagePath}`;

          // 5. Insert record into database
          const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/telegram_receipts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              sender_name: senderName,
              image_url: publicUrl,
              storage_path: storagePath,
              status: 'pending'
            })
          });

          if (!dbRes.ok) {
            const dbErrorText = await dbRes.text();
            console.error(`[Telegram] Failed to insert DB record:`, dbErrorText);
          } else {
            console.log(`[Telegram] Successfully imported photo from ${senderName}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Telegram] Polling error:', err.message);
  } finally {
    // Schedule next poll
    setTimeout(pollTelegram, 2000);
  }
}

console.log('🚀 Starting Telegram Poller for NCG FleetFlow OCR...');
console.log(`Listening to chat: ${TARGET_CHAT_ID}`);
pollTelegram();
