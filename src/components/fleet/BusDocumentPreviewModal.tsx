import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import busDocsManifest from "@/data/bus_documents.json";
import { FileText, Image as ImageIcon, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BusDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busNo: string;
}

export const BusDocumentPreviewModal = ({
  open,
  onOpenChange,
  busNo,
}: BusDocumentPreviewModalProps) => {
  const [documents, setDocuments] = useState<string[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  useEffect(() => {
    if (open && busNo) {
      // Find exact or partial match
      const docMap = busDocsManifest as Record<string, string[]>;
      
      // Attempt to resolve if exactly matching (e.g. "NC 8222")
      let match = docMap[busNo];
      
      // If no exact match, try stripping spaces
      if (!match) {
        const withoutSpaces = busNo.replace(/\s+/g, '');
        const keyMatch = Object.keys(docMap).find(k => k.replace(/\s+/g, '') === withoutSpaces);
        if (keyMatch) {
          match = docMap[keyMatch];
        }
      }

      if (match) {
        setDocuments(match);
        setActiveDoc(match[0]);
      } else {
        setDocuments([]);
        setActiveDoc(null);
      }
    }
  }, [open, busNo]);

  const getPublicUrl = (fileName: string) => {
    // We try exactly the key format, though it's safer to reconstruct.
    // The key in manifest was the folder name.
    const keyMatch = Object.keys(busDocsManifest).find(k => 
      k.replace(/\s+/g, '') === busNo.replace(/\s+/g, '')
    );
    return `/bus_details/${keyMatch}/${fileName}`;
  };

  const isPdf = (fileName: string) => fileName.toLowerCase().endsWith('.pdf');
  const isImage = (fileName: string) => 
    ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileName.toLowerCase().endsWith(ext));

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Document Archive: {busNo}
          </DialogTitle>
          <DialogDescription>
            {documents.length > 0 
              ? `Found ${documents.length} verified documents for this vehicle.` 
              : `No scanned documents found in the repository for this vehicle.`}
          </DialogDescription>
        </DialogHeader>

        {documents.length > 0 ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-1/3 min-w-[250px] border-r bg-muted/10 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {documents.map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveDoc(doc)}
                      className={`w-full flex items-center gap-3 p-3 text-left rounded-xl transition-all duration-200 border ${
                        activeDoc === doc 
                          ? 'bg-primary/10 border-primary shadow-sm text-primary' 
                          : 'bg-background border-border hover:border-primary/50 hover:bg-muted'
                      }`}
                    >
                      {isPdf(doc) ? (
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-sm truncate" title={doc}>
                          {doc.split('/').pop()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isPdf(doc) ? 'PDF Document' : 'Scanned Image'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center relative p-6">
              {activeDoc && (
                <>
                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => window.open(getPublicUrl(activeDoc), '_blank')}
                      className="gap-2 shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Full Size
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      asChild
                      className="gap-2 shadow-sm"
                    >
                      <a href={getPublicUrl(activeDoc)} download>
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </Button>
                  </div>

                  <div className="w-full h-full rounded-xl border bg-background shadow-inner flex items-center justify-center overflow-hidden">
                    {isPdf(activeDoc) ? (
                      <iframe 
                        src={`${getPublicUrl(activeDoc)}#toolbar=0`} 
                        className="w-full h-full border-0"
                        title={activeDoc}
                      />
                    ) : isImage(activeDoc) ? (
                      <img 
                        src={getPublicUrl(activeDoc)} 
                        alt={activeDoc} 
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Preview not available for this file type.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/10">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 opacity-50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Documents Available</h3>
            <p className="max-w-md">
              We couldn't find any uploaded physical registration files, permits, or fitness certificates for bus <span className="font-bold text-foreground">{busNo}</span> in the fleet document repository natively.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
