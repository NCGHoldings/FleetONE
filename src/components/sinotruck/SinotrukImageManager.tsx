import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trash2, Star, GripVertical, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SinotrukImageUploader } from './SinotrukImageUploader';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

interface BusModelImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  caption?: string;
}

interface SinotrukImageManagerProps {
  busModelId: string;
  busModelName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function SinotrukImageManager({ 
  busModelId, 
  busModelName,
  isOpen, 
  onClose,
  onUpdate 
}: SinotrukImageManagerProps) {
  const [images, setImages] = useState<BusModelImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();

  const loadImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sinotruck_bus_model_images')
        .select('*')
        .eq('bus_model_id', busModelId)
        .order('display_order');

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen, busModelId]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setImages(updatedItems);

    try {
      // Update all items in database
      for (const item of updatedItems) {
        const { error } = await supabase
          .from('sinotruck_bus_model_images')
          .update({ display_order: item.display_order })
          .eq('id', item.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Image order updated"
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      loadImages(); // Reload on error
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // First, unset all other primary flags
      await supabase
        .from('sinotruck_bus_model_images')
        .update({ is_primary: false })
        .eq('bus_model_id', busModelId);

      // Then set the selected image as primary
      const { error } = await supabase
        .from('sinotruck_bus_model_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Primary image updated"
      });
      
      loadImages();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateCaption = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('sinotruck_bus_model_images')
        .update({ caption: captionValue || null })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Caption updated"
      });
      
      setEditingCaption(null);
      setCaptionValue('');
      loadImages();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('sinotruck-bus-models')
        .remove([fileName]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('sinotruck_bus_model_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Image deleted"
      });
      
      loadImages();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Manage Images - {busModelName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Upload Section */}
          <div>
            <Button
              onClick={() => setShowUploader(!showUploader)}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {showUploader ? 'Hide Uploader' : 'Upload More Images'}
            </Button>
            
            {showUploader && (
              <div className="mt-4">
                <SinotrukImageUploader
                  busModelId={busModelId}
                  onUploadComplete={() => {
                    loadImages();
                    onUpdate();
                    setShowUploader(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Images Grid */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading images...
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No images uploaded yet
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="images">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {images.map((image, index) => (
                      <Draggable
                        key={image.id}
                        draggableId={image.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-4 ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="flex gap-4">
                              <div
                                {...provided.dragHandleProps}
                                className="flex items-center cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>

                              <img
                                src={image.image_url}
                                alt="Bus model"
                                className="w-24 h-24 object-cover rounded-lg"
                              />

                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  {image.is_primary && (
                                    <Badge variant="default">
                                      <Star className="h-3 w-3 mr-1 fill-current" />
                                      Primary
                                    </Badge>
                                  )}
                                  <Badge variant="outline">
                                    Position {index + 1}
                                  </Badge>
                                </div>

                                {editingCaption === image.id ? (
                                  <div className="flex gap-2">
                                    <Input
                                      value={captionValue}
                                      onChange={(e) => setCaptionValue(e.target.value)}
                                      placeholder="Add a caption (optional)"
                                      className="flex-1"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateCaption(image.id)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingCaption(null);
                                        setCaptionValue('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      {image.caption || 'No caption'}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="link"
                                      className="h-auto p-0"
                                      onClick={() => {
                                        setEditingCaption(image.id);
                                        setCaptionValue(image.caption || '');
                                      }}
                                    >
                                      Edit caption
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2">
                                {!image.is_primary && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetPrimary(image.id)}
                                  >
                                    <Star className="h-4 w-4 mr-1" />
                                    Set as Primary
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(image.id, image.image_url)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}