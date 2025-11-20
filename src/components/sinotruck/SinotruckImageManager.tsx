import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trash2, Star, GripVertical, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SinotruckImageUploader } from './SinotruckImageUploader';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

interface TruckModelImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  caption?: string;
}

interface SinotruckImageManagerProps {
  truckModelId: string;
  truckModelName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function SinotruckImageManager({ 
  truckModelId, 
  truckModelName,
  isOpen, 
  onClose,
  onUpdate 
}: SinotruckImageManagerProps) {
  const [images, setImages] = useState<TruckModelImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();

  const loadImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sinotruck_truck_model_images')
        .select('*')
        .eq('truck_model_id', truckModelId)
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
  }, [isOpen, truckModelId]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setImages(updatedItems);

    try {
      for (const item of updatedItems) {
        const { error } = await supabase
          .from('sinotruck_truck_model_images')
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
      loadImages();
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await supabase
        .from('sinotruck_truck_model_images')
        .update({ is_primary: false })
        .eq('truck_model_id', truckModelId);

      const { error } = await supabase
        .from('sinotruck_truck_model_images')
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

  const handleUpdateCaption = async (imageId: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('sinotruck_truck_model_images')
        .update({ caption })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Caption updated"
      });
      
      setEditingCaption(null);
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
    if (!confirm('Delete this image?')) return;

    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('sinotruck-truck-models')
          .remove([`${truckModelId}/${fileName}`]);
      }

      const { error } = await supabase
        .from('sinotruck_truck_model_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Manage Images - {truckModelName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {showUploader ? (
            <div>
              <SinotruckImageUploader
                truckModelId={truckModelId}
                onUploadComplete={() => {
                  loadImages();
                  setShowUploader(false);
                  onUpdate();
                }}
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowUploader(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button onClick={() => setShowUploader(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Images
              </Button>

              {loading ? (
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : images.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No images yet. Upload some images to get started.
                </p>
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
                                    alt="Truck"
                                    className="w-32 h-32 object-cover rounded"
                                  />

                                  <div className="flex-1 space-y-2">
                                    {editingCaption === image.id ? (
                                      <div className="flex gap-2">
                                        <Input
                                          value={captionValue}
                                          onChange={(e) => setCaptionValue(e.target.value)}
                                          placeholder="Enter caption..."
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateCaption(image.id, captionValue)}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingCaption(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <div
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setEditingCaption(image.id);
                                          setCaptionValue(image.caption || '');
                                        }}
                                      >
                                        <p className="text-sm text-muted-foreground">
                                          {image.caption || 'Click to add caption...'}
                                        </p>
                                      </div>
                                    )}

                                    <div className="flex gap-2">
                                      {image.is_primary && (
                                        <Badge variant="default">Primary</Badge>
                                      )}
                                      <Badge variant="outline">Order: {index + 1}</Badge>
                                    </div>

                                    <div className="flex gap-2">
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
