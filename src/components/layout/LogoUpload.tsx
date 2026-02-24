import { useState } from "react";
import { Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LogoUploadProps {
  currentLogoUrl?: string;
  onLogoUpdate: (logoUrl: string) => void;
}

export function LogoUpload({ currentLogoUrl, onLogoUpdate }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (PNG, JPG, SVG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Save logo URL to system settings
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'company_logo_url',
          setting_value: publicUrl,
          category: 'branding',
          description: 'Company logo URL for sidebar display'
        }, {
          onConflict: 'setting_key'
        });

      if (settingsError) throw settingsError;

      onLogoUpdate(publicUrl);
      setDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully!",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      // Remove from system settings
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('setting_key', 'company_logo_url');

      if (error) throw error;

      onLogoUpdate('');
      setDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Logo removed successfully!",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: "Failed to remove logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-primary/20 transition-all duration-200"
          title="Manage Logo"
        >
          <Image className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Company Logo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentLogoUrl && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img 
                  src={currentLogoUrl} 
                  alt="Current Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={removeLogo}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Remove Logo
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="logo-upload"
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Click to upload logo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, SVG up to 2MB
                  </p>
                </div>
              </div>
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}