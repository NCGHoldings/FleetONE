import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricText, FabricImage, PencilBrush } from 'fabric';
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
  Pen,
  MousePointer
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EnhancedPDFViewerProps {
  pdfUrl: string;
  onSave?: (canvasData: string) => void;
  onDownload?: () => void;
}

export const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  pdfUrl,
  onSave,
  onDownload
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'image' | 'draw'>('select');
  const [textToAdd, setTextToAdd] = useState('');
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    if (!fabricCanvas || !pdfContainerRef.current) return;
    
    const container = pdfContainerRef.current;
    const rect = container.getBoundingClientRect();
    
    fabricCanvas.setDimensions({
      width: rect.width,
      height: rect.height
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  useEffect(() => {
    if (!canvasRef.current || !pdfContainerRef.current) return;

    const container = pdfContainerRef.current;
    const rect = container.getBoundingClientRect();

    // Initialize Fabric canvas with container dimensions
    const canvas = new FabricCanvas(canvasRef.current, {
      width: rect.width || 800,
      height: rect.height || 600,
      backgroundColor: 'transparent',
    });

    // Set canvas properties
    canvas.selection = true;
    canvas.preserveObjectStacking = true;
    
    // Initialize drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 2;
    canvas.freeDrawingBrush.color = '#000000';

    setFabricCanvas(canvas);
    setIsCanvasReady(true);
    toast.success('PDF Editor ready! Use the toolbar to add annotations.');

    // Handle window resize
    const handleResize = () => {
      setTimeout(resizeCanvas, 100);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle tool changes
  useEffect(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.isDrawingMode = activeTool === 'draw';
    fabricCanvas.selection = activeTool === 'select';
    
    if (activeTool === 'draw' && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.width = 2;
      fabricCanvas.freeDrawingBrush.color = '#000000';
    }
  }, [activeTool, fabricCanvas]);

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

    // Synchronize canvas zoom
    if (fabricCanvas) {
      const scale = clampedZoom / 100;
      fabricCanvas.setZoom(scale);
      fabricCanvas.renderAll();
      resizeCanvas();
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

  // Save canvas data and create combined PDF
  const handleSave = async () => {
    if (!fabricCanvas || !pdfContainerRef.current) return;
    
    try {
      // Save canvas JSON data
      const canvasData = fabricCanvas.toJSON();
      onSave?.(JSON.stringify(canvasData));
      
      // Create a combined PDF with annotations
      await createAnnotatedPDF();
      
      toast.success('Document with annotations saved');
    } catch (error) {
      console.error('Error saving canvas data:', error);
      toast.error('Failed to save annotations');
    }
  };

  // Create PDF with annotations
  const createAnnotatedPDF = async () => {
    if (!fabricCanvas || !pdfContainerRef.current) return;

    try {
      // Capture the entire container (PDF + annotations)
      const canvas = await html2canvas(pdfContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('annotated-document.pdf');
      
      toast.success('Annotated PDF downloaded');
    } catch (error) {
      console.error('Error creating annotated PDF:', error);
      toast.error('Failed to create annotated PDF');
    }
  };

  // Clear all annotations
  const handleClear = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.renderAll();
    toast.success('All annotations cleared');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        {/* Document tools */}
        <div className="flex items-center gap-1">
          {/* Selection tool */}
          <Button
            variant={activeTool === 'select' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTool('select')}
            title="Select objects"
          >
            <MousePointer className="w-4 h-4 mr-1" />
            Select
          </Button>
          
          {/* Drawing tool */}
          <Button
            variant={activeTool === 'draw' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTool('draw')}
            title="Draw freehand"
          >
            <Pen className="w-4 h-4 mr-1" />
            Draw
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Text tool */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeTool === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('text')}
              title="Add text"
            >
              <Type className="w-4 h-4 mr-1" />
              Text
            </Button>
            
            {activeTool === 'text' && (
              <div className="flex items-center gap-1 ml-2">
                <Input
                  placeholder="Enter text..."
                  value={textToAdd}
                  onChange={(e) => setTextToAdd(e.target.value)}
                  className="w-32 h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddText();
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddText}>
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Image tool */}
          <Button
            variant={activeTool === 'image' ? 'default' : 'ghost'}
            size="sm"
            onClick={handleAddImage}
            title="Add image"
          >
            <ImageIcon className="w-4 h-4 mr-1" />
            Image
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom(zoom - 25)}
            disabled={zoom <= 25}
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
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title="Delete selected object"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            title="Clear all annotations"
          >
            Clear
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            title="Save annotations"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              title="Download PDF"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>

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
            background: 'transparent',
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <div>
          Mode: {activeTool === 'select' ? 'Selection' : activeTool === 'draw' ? 'Drawing' : activeTool === 'text' ? 'Text Addition' : 'Image Addition'}
        </div>
        <div>
          Canvas: {isCanvasReady ? 'Ready' : 'Loading...'}
        </div>
      </div>
    </div>
  );
};