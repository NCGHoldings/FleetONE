import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LightVehicleImageUploaderProps {
  busModelId: string;
  onUploadComplete: () => void;
  maxImages?: number;
}

interface UploadingFile {
  file: File;
  progress: number;
  preview: string;
}

export function LightVehicleImageUploader({ 
  busModelId, 
  onUploadComplete,
  maxImages = 10 
}: LightVehicleImageUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > maxImages) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxImages} images at once`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const filesToUpload = acceptedFiles.slice(0, maxImages).map(file => ({
      file,
      progress: 0,
      preview: URL.createObjectURL(file)
    }));
    
    setUploadingFiles(filesToUpload);

    try {
      // Get current max display_order
      const { data: existingImages } = await (supabase as any)
        .from('lightvehicle_bus_model_images')
        .select('display_order')
        .eq('bus_model_id', busModelId)
        .order('display_order', { ascending: false })
        .limit(1);

      let currentOrder = existingImages && existingImages.length > 0 
        ? existingImages[0].display_order + 1 
        : 0;

      // Upload each file
      for (let i = 0; i < filesToUpload.length; i++) {
        const { file } = filesToUpload[i];
        
        // Update progress
        setUploadingFiles(prev => 
          prev.map((f, idx) => idx === i ? { ...f, progress: 30 } : f)
        );

        const fileExt = file.name.split('.').pop();
        const fileName = `${busModelId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await (supabase as any).storage
          .from('lightvehicle-bus-models')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        setUploadingFiles(prev => 
          prev.map((f, idx) => idx === i ? { ...f, progress: 60 } : f)
        );

        const { data: { publicUrl } } = supabase.storage
          .from('lightvehicle-bus-models')
          .getPublicUrl(filePath);

        // Check if this is the first image for this model
        const { data: imageCount } = await (supabase as any)
          .from('lightvehicle_bus_model_images')
          .select('id', { count: 'exact', head: true })
          .eq('bus_model_id', busModelId);

        const isPrimary = !imageCount || imageCount.length === 0;

        // Insert into database
        const { error: dbError } = await (supabase as any)
          .from('lightvehicle_bus_model_images')
          .insert({
            bus_model_id: busModelId,
            image_url: publicUrl,
            display_order: currentOrder++,
            is_primary: isPrimary
          });

        if (dbError) throw dbError;

        setUploadingFiles(prev => 
          prev.map((f, idx) => idx === i ? { ...f, progress: 100 } : f)
        );
      }

      toast({
        title: "Success",
        description: `${filesToUpload.length} image(s) uploaded successfully`
      });

      // Clean up previews
      filesToUpload.forEach(f => URL.revokeObjectURL(f.preview));
      setUploadingFiles([]);
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [busModelId, maxImages, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: maxImages,
    disabled: isUploading
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg">Drop the images here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium mb-2">
              Drag & drop images here, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              Upload up to {maxImages} images (PNG, JPG, JPEG, WEBP)
            </p>
          </div>
        )}
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Uploading {uploadingFiles.length} image(s)
          </h4>
          {uploadingFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              <img
                src={file.preview}
                alt="Preview"
                className="h-12 w-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <Progress value={file.progress} className="h-2 mt-1" />
              </div>
              {!isUploading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}