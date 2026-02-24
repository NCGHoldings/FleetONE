import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from '@/components/ui/carousel';

interface BusModelImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  caption?: string;
}

interface YutongImageGalleryProps {
  images: BusModelImage[];
  className?: string;
}

export function YutongImageGallery({ images, className }: YutongImageGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const goToSlide = (index: number) => {
    api?.scrollTo(index);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  if (sortedImages.length === 0) {
    return (
      <Card className={className}>
        <div className="aspect-video bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No images available</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className={className}>
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {sortedImages.map((image) => (
              <CarouselItem key={image.id}>
                <Card className="border-0">
                  <div className="relative aspect-video bg-muted group">
                    <img
                      src={image.image_url}
                      alt={image.caption || 'Bus model image'}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setLightboxOpen(true);
                        resetZoom();
                      }}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    {image.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 rounded-b-lg">
                        <p className="text-sm">{image.caption}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>

          {sortedImages.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                onClick={scrollPrev}
                disabled={current === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                onClick={scrollNext}
                disabled={current === sortedImages.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </Carousel>

        {sortedImages.length > 1 && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">
                {current + 1} / {sortedImages.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sortedImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => goToSlide(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    current === index 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img
                    src={image.image_url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <div className="relative bg-black">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="overflow-auto max-h-[95vh] flex items-center justify-center p-8">
              <img
                src={sortedImages[current].image_url}
                alt={sortedImages[current].caption || 'Bus model image'}
                className="max-w-full transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            {sortedImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={scrollPrev}
                  disabled={current === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={scrollNext}
                  disabled={current === sortedImages.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  {current + 1} / {sortedImages.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}