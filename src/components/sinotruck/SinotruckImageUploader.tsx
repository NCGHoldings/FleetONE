import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadingFile {
  file: File;
  progress: number;
  preview: string;
}

interface SinotruckImageUploaderProps {
  truckModelId: string;
  onUploadComplete: () => void;
  maxImages?: number;
}

export function SinotruckImageUploader({ 
  truckModelId, 
  onUploadComplete,
  maxImages = 10 
}: SinotruckImageUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    if (acceptedFiles.length > maxImages) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxImages} images allowed`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const filesToUpload = acceptedFiles.map(file => ({
      file,
      progress: 0,
      preview: URL.createObjectURL(file)
    }));
    setUploadingFiles(filesToUpload);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileData = filesToUpload[i];
        const fileName = `${truckModelId}/${Date.now()}-${fileData.file.name}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sinotruck-truck-models')
          .upload(fileName, fileData.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('sinotruck-truck-models')
          .getPublicUrl(fileName);

        // Get existing images count for display_order
        const { count } = await supabase
          .from('sinotruck_truck_model_images')
          .select('*', { count: 'exact', head: true })
          .eq('truck_model_id', truckModelId);

        const displayOrder = count || 0;
        const isPrimary = displayOrder === 0; // First image is primary

        // Save to database
        const { error: dbError } = await supabase
          .from('sinotruck_truck_model_images')
          .insert({
            truck_model_id: truckModelId,
            image_url: publicUrl,
            display_order: displayOrder,
            is_primary: isPrimary
          });

        if (dbError) throw dbError;

        // Update progress
        setUploadingFiles(prev => 
          prev.map((f, idx) => 
            idx === i ? { ...f, progress: 100 } : f
          )
        );
      }

      toast({
        title: "Success",
        description: `${filesToUpload.length} image(s) uploaded successfully`
      });
      
      onUploadComplete();
      setUploadingFiles([]);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [truckModelId, maxImages, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: maxImages,
    disabled: isUploading
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          {isDragActive ? (
            'Drop the images here...'
          ) : (
            <>
              Drag & drop images here, or click to select
              <br />
              <span className="text-xs">Maximum {maxImages} images (PNG, JPG, WEBP)</span>
            </>
          )}
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((file, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-3">
                <img 
                  src={file.preview} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <Progress value={file.progress} className="mt-2" />
                </div>
                {file.progress < 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
