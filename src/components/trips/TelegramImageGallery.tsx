import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, CheckCircle2, Clock, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface TelegramReceipt {
  id: string;
  chat_id: string;
  message_id: string;
  sender_name: string;
  image_url: string;
  status: 'pending' | 'processing' | 'completed';
  created_at: string;
}

interface TelegramImageGalleryProps {
  onImageSelect: (file: File) => void;
  className?: string;
}

export function TelegramImageGallery({ onImageSelect, className }: TelegramImageGalleryProps) {
  const [images, setImages] = useState<TelegramReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingImages();

    // Subscribe to new images
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telegram_receipts',
          filter: "status=eq.pending"
        },
        (payload) => {
          const newImage = payload.new as TelegramReceipt;
          console.log('New Telegram image received:', newImage);
          setImages(prev => [newImage, ...prev]);
          toast.success('New image received from Telegram!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'telegram_receipts',
        },
        (payload) => {
          const updatedImage = payload.new as TelegramReceipt;
          if (updatedImage.status !== 'pending') {
            // Remove from list if no longer pending
            setImages(prev => prev.filter(img => img.id !== updatedImage.id));
          } else {
            // Update existing
            setImages(prev => prev.map(img => img.id === updatedImage.id ? updatedImage : img));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingImages = async () => {
    try {
      setLoading(true);
      
      // DEBUG: Fetch ALL records to see what is actually in the DB
      const { data: allData, error: allError } = await supabase
        .from('telegram_receipts')
        .select('*');
      console.log('DEBUG: All records in telegram_receipts:', allData);
      if (allError) console.error('DEBUG: Error fetching all records:', allError);

      const { data, error } = await supabase
        .from('telegram_receipts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase fetch error for telegram_receipts:', error);
        // If table doesn't exist yet, suppress error to UI but log it
        if (error.code === '42P01') {
          console.log('Telegram table not created yet. Please run migrations.');
          return;
        }
        throw error;
      }

      setImages(data || []);
    } catch (error) {
      console.error('Error fetching telegram images:', error);
      toast.error('Failed to load Telegram images');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async (receipt: TelegramReceipt) => {
    try {
      setDownloadingId(receipt.id);
      
      // Fetch the image blob
      const response = await fetch(receipt.image_url);
      if (!response.ok) throw new Error('Failed to download image');
      
      const blob = await response.blob();
      
      // Create a File object
      const extension = receipt.image_url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `telegram_${receipt.sender_name}_${receipt.message_id}.${extension}`;
      
      const file = new File([blob], fileName, { type: blob.type });
      
      // Mark as processing in DB so others don't process it simultaneously
      await supabase
        .from('telegram_receipts')
        .update({ status: 'processing' })
        .eq('id', receipt.id);
        
      // Pass to parent
      onImageSelect(file);
      
      toast.success('Image imported to Quick Entry');
    } catch (error) {
      console.error('Error importing image:', error);
      toast.error('Failed to import image from Telegram');
      setDownloadingId(null);
    }
  };

  const markAsIgnored = async (id: string) => {
    try {
      await supabase
        .from('telegram_receipts')
        .update({ status: 'ignored' })
        .eq('id', id);
      
      setImages(prev => prev.filter(img => img.id !== id));
      toast.success('Image dismissed');
    } catch (error) {
      console.error('Error dismissing image:', error);
      toast.error('Failed to dismiss image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Connecting to Telegram...</span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20 text-center">
        <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No pending Telegram images</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Photos sent to the Telegram group will appear here instantly.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500" />
          Pending from Telegram ({images.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchPendingImages} className="h-8 px-2 text-xs">
          Refresh
        </Button>
      </div>
      
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
        {images.map(image => (
          <Card key={image.id} className="min-w-[200px] max-w-[200px] shrink-0 snap-start overflow-hidden group">
            <div className="relative h-32 bg-muted">
              <img 
                src={image.image_url} 
                alt="Telegram Receipt" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button 
                  size="sm" 
                  variant="default" 
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => handleSelectImage(image)}
                  disabled={downloadingId === image.id}
                >
                  {downloadingId === image.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => markAsIgnored(image.id)}
                  disabled={downloadingId === image.id}
                >
                  <span className="sr-only">Dismiss</span>
                  &times;
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-xs font-medium truncate" title={image.sender_name}>
                From: {image.sender_name}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(image.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
