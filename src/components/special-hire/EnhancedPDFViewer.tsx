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

  // Download PDF with annotations
  const handleDownloadWithAnnotations = async () => {
    if (!fabricCanvas || !pdfContainerRef.current) return;
    
    setIsGenerating(true);
    const loadingToast = toast.loading('Generating PDF with annotations...');
    
    try {
      // Create a wrapper to capture both PDF and canvas
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '800px';
      wrapper.style.height = '1100px';
      wrapper.style.backgroundColor = 'white';
      
      // Create an image from the PDF iframe
      const iframe = pdfContainerRef.current.querySelector('iframe');
      if (!iframe) throw new Error('PDF iframe not found');
      
      // Wait a bit for PDF to fully render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture the current view by screenshotting the container
      const pdfScreenshot = await html2canvas(pdfContainerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: pdfContainerRef.current.scrollWidth,
        windowHeight: pdfContainerRef.current.scrollHeight,
      });
      
      // Convert PDF screenshot to image
      const pdfImage = new Image();
      pdfImage.src = pdfScreenshot.toDataURL('image/png');
      await new Promise((resolve) => { pdfImage.onload = resolve; });
      
      wrapper.appendChild(pdfImage);
      
      // Get annotations as image
      const annotationsDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });
      
      const annotationsImage = new Image();
      annotationsImage.src = annotationsDataUrl;
      annotationsImage.style.position = 'absolute';
      annotationsImage.style.top = '0';
      annotationsImage.style.left = '0';
      await new Promise((resolve) => { annotationsImage.onload = resolve; });
      
      wrapper.appendChild(annotationsImage);
      
      // Add wrapper to DOM temporarily (hidden)
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      document.body.appendChild(wrapper);
      
      // Capture the combined content
      const combinedCanvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Clean up
      document.body.removeChild(wrapper);
      
      // Create PDF from the combined canvas
      const imgData = combinedCanvas.toDataURL('image/png');
      const imgWidth = combinedCanvas.width;
      const imgHeight = combinedCanvas.height;
      
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save('annotated-document.pdf');
      
      toast.success('PDF with annotations downloaded successfully', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF with annotations:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-background shadow-sm">
        {/* Document tools */}
        <div className="flex items-center gap-1">
          <Button
            variant={activeTool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTool('select')}
            title="Select and move objects"
          >
            <MousePointer className="w-4 h-4 mr-1" />
            Select
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Drawing tool */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeTool === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('draw')}
              title="Free drawing"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Draw
            </Button>
            
            {activeTool === 'draw' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => setDrawingColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                  title="Drawing color"
                />
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-16 h-8"
                  title="Brush width"
                />
              </div>
            )}
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Text tool */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeTool === 'text' ? 'default' : 'outline'}
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

          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Image tool */}
          <Button
            variant={activeTool === 'image' ? 'default' : 'outline'}
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
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            title="Delete selected object"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            title="Clear all annotations"
          >
            Clear All
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            title="Save annotations"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadWithAnnotations}
            disabled={isGenerating}
            title="Download PDF with annotations"
          >
            <Download className="w-4 h-4 mr-1" />
            {isGenerating ? 'Generating...' : 'Download'}
          </Button>
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
            background: 'transparent'
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/50 text-xs text-muted-foreground">
        <div>
          Mode: {
            activeTool === 'select' ? 'Selection' : 
            activeTool === 'draw' ? 'Free Drawing' :
            activeTool === 'text' ? 'Text Addition' : 
            'Image Addition'
          }
        </div>
        <div className="flex items-center gap-4">
          <span>Canvas: {isCanvasReady ? 'Ready ✓' : 'Loading...'}</span>
          <span>Zoom: {zoom}%</span>
        </div>
      </div>
    </div>
  );
};