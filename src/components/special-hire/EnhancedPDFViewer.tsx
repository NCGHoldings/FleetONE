import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricText, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Type, 
  Image as ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Save,
  Trash2,
  Pencil,
  MousePointer
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EnhancedPDFViewerProps {
  pdfUrl: string;
  onSave?: (canvasData: string) => void;
  onDownloadReady?: (downloadFn: () => void) => void;
}

export const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  pdfUrl,
  onSave,
  onDownloadReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'text' | 'image'>('select');
  const [textToAdd, setTextToAdd] = useState('');
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !pdfContainerRef.current) return;

    // Initialize Fabric canvas
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: 'transparent',
    });

    // Initialize free drawing brush - only if it exists
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = drawingColor;
      canvas.freeDrawingBrush.width = brushWidth;
    }
    
    // Set canvas to be overlay on top of PDF
    canvas.selection = true;
    canvas.preserveObjectStacking = true;

    setFabricCanvas(canvas);
    setIsCanvasReady(true);
    toast.success('PDF Editor ready! Use the toolbar to draw, add text and images.');

    return () => {
      canvas.dispose();
    };
  }, []);

  // Handle tool changes
  // Pass download function to parent once canvas is ready
  useEffect(() => {
    if (fabricCanvas && isCanvasReady && onDownloadReady) {
      onDownloadReady(handleDownloadWithAnnotations);
    }
  }, [fabricCanvas, isCanvasReady, onDownloadReady]);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Enable/disable drawing mode based on active tool
    fabricCanvas.isDrawingMode = activeTool === 'draw';
    
    if (activeTool === 'draw' && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = drawingColor;
      fabricCanvas.freeDrawingBrush.width = brushWidth;
    }
    
    // Enable selection for other tools
    if (activeTool === 'select') {
      fabricCanvas.selection = true;
    }
  }, [activeTool, drawingColor, brushWidth, fabricCanvas]);

  // Handle zoom changes
  const handleZoom = (newZoom: number) => {
    const clampedZoom = Math.max(25, Math.min(200, newZoom));
    setZoom(clampedZoom);
    
    if (pdfContainerRef.current) {
      const iframe = pdfContainerRef.current.querySelector('iframe');
      if (iframe) {
        iframe.style.transform = `scale(${clampedZoom / 100})`;
        iframe.style.transformOrigin = 'top left';
      }
    }

    // Adjust canvas size proportionally
    if (fabricCanvas) {
      const scale = clampedZoom / 100;
      fabricCanvas.setZoom(scale);
      fabricCanvas.renderAll();
    }
  };

  // Add text to canvas
  const handleAddText = () => {
    if (!fabricCanvas || !textToAdd.trim()) {
      toast.error('Please enter text to add');
      return;
    }

    const text = new FabricText(textToAdd, {
      left: 100,
      top: 100,
      fontSize: 16,
      fill: '#000000',
      fontFamily: 'Arial',
      editable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    
    setTextToAdd('');
    setActiveTool('select');
    toast.success('Text added to document');
  };

  // Add image to canvas
  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      
      FabricImage.fromURL(imgUrl, {
        crossOrigin: 'anonymous'
      }).then((img) => {
        // Scale image to fit reasonably on canvas
        img.scaleToWidth(200);
        img.set({
          left: 150,
          top: 150,
        });
        
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        
        toast.success('Image added to document');
      });
    };
    
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset file input
  };

  // Delete selected object
  const handleDelete = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      fabricCanvas.remove(activeObject);
      fabricCanvas.renderAll();
      toast.success('Object deleted');
    }
  };

  // Save canvas data
  const handleSave = () => {
    if (!fabricCanvas) return;
    
    try {
      const canvasData = fabricCanvas.toJSON();
      onSave?.(JSON.stringify(canvasData));
      toast.success('Document annotations saved');
    } catch (error) {
      console.error('Error saving canvas data:', error);
      toast.error('Failed to save annotations');
    }
  };

  // Clear all annotations
  const handleClear = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.renderAll();
    toast.success('All annotations cleared');
  };

  // Download PDF with annotations - improved method
  const handleDownloadWithAnnotations = async () => {
    if (!fabricCanvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    setIsGenerating(true);
    const loadingToast = toast.loading('Generating PDF with annotations...');
    
    try {
      // Get the canvas dimensions
      const canvasWidth = fabricCanvas.width || 800;
      const canvasHeight = fabricCanvas.height || 600;
      
      // Create a high-quality canvas for export
      const exportCanvas = document.createElement('canvas');
      const scale = 2; // High DPI
      exportCanvas.width = canvasWidth * scale;
      exportCanvas.height = canvasHeight * scale;
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      // Try to capture the PDF iframe
      const pdfContainer = pdfContainerRef.current;
      if (pdfContainer) {
        try {
          const captured = await html2canvas(pdfContainer, {
            scale: scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
          });
          ctx.drawImage(captured, 0, 0, exportCanvas.width, exportCanvas.height);
        } catch (err) {
          console.warn('PDF capture failed, using white background:', err);
        }
      }
      
      // Export fabric canvas with high quality
      const annotationsURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: scale,
      });
      
      // Draw annotations on top
      const annotImg = new Image();
      await new Promise<void>((resolve, reject) => {
        annotImg.onload = () => resolve();
        annotImg.onerror = reject;
        annotImg.src = annotationsURL;
      });
      
      ctx.drawImage(annotImg, 0, 0, exportCanvas.width, exportCanvas.height);
      
      // Convert to PDF
      const finalImage = exportCanvas.toDataURL('image/png', 1.0);
      const pdfWidth = 210;
      const pdfHeight = (exportCanvas.height / exportCanvas.width) * pdfWidth;
      
      const pdf = new jsPDF({
        orientation: exportCanvas.width > exportCanvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(finalImage, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      pdf.save(`annotated-pdf-${timestamp}.pdf`);
      
      toast.success('PDF downloaded with annotations!', { id: loadingToast });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download. Please try again.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Toolbar - Blue Box */}
      <div className="flex items-center gap-2 p-2 bg-primary/10 border-b">
        {/* Core Tools */}
        <Button
          variant={activeTool === 'select' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTool('select')}
          title="Select"
          className="h-9 w-9 p-0"
        >
          <MousePointer className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'draw' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTool('draw')}
          title="Draw"
          className="h-9 w-9 p-0"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTool('text')}
          title="Text"
          className="h-9 w-9 p-0"
        >
          <Type className="w-4 h-4" />
        </Button>
        
        <Button
          variant={activeTool === 'image' ? 'default' : 'ghost'}
          size="sm"
          onClick={handleAddImage}
          title="Image"
          className="h-9 w-9 p-0"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        <Separator orientation="vertical" className="h-6 mx-2" />
        
        {/* Zoom Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom(zoom - 25)}
          disabled={zoom <= 25}
          className="h-9 w-9 p-0"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <span className="text-sm font-medium min-w-[60px] text-center">
          {zoom}%
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom(zoom + 25)}
          disabled={zoom >= 200}
          className="h-9 w-9 p-0"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-2" />
        
        {/* Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          title="Delete"
          className="h-9 w-9 p-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          title="Clear All"
        >
          Clear All
        </Button>
        
        <div className="flex-1" />
        
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          title="Save"
          className="h-9 w-9 p-0"
        >
          <Save className="w-4 h-4" />
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={handleDownloadWithAnnotations}
          disabled={isGenerating}
          title="Download"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
      
      {/* Tool Options Bar */}
      {(activeTool === 'draw' || activeTool === 'text') && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 border-b">
          {activeTool === 'draw' && (
            <>
              <span className="text-sm">Color:</span>
              <input
                type="color"
                value={drawingColor}
                onChange={(e) => setDrawingColor(e.target.value)}
                className="w-8 h-8 rounded border cursor-pointer"
              />
              <span className="text-sm ml-2">Width:</span>
              <Input
                type="number"
                min="1"
                max="20"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-20 h-8"
              />
            </>
          )}
          
          {activeTool === 'text' && (
            <>
              <Input
                placeholder="Type text here..."
                value={textToAdd}
                onChange={(e) => setTextToAdd(e.target.value)}
                className="flex-1 h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textToAdd.trim()) {
                    handleAddText();
                  }
                }}
              />
              <Button 
                size="sm" 
                onClick={handleAddText}
                disabled={!textToAdd.trim()}
              >
                Add Text
              </Button>
            </>
          )}
        </div>
      )}

      {/* PDF Viewer Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* PDF Display */}
        <div 
          ref={pdfContainerRef}
          className="absolute inset-0 bg-gray-100"
          style={{ 
            transformOrigin: 'top left',
            overflow: 'auto'
          }}
        >
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Document"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          />
        </div>

        {/* Fabric Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{
            zIndex: 10,
            background: 'transparent'
          }}
        />
      </div>
    </div>
  );
};