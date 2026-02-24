import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  Eye, 
  Download, 
  RotateCcw, 
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  FileText,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentType, DocumentVersion, useDocumentFlow } from '@/hooks/useDocumentFlow';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DocumentVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  documentType: DocumentType;
  versions: DocumentVersion[];
  onRestore?: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  preview: 'bg-blue-100 text-blue-800',
  generated: 'bg-green-100 text-green-800',
  sent: 'bg-purple-100 text-purple-800',
  approved: 'bg-emerald-100 text-emerald-800'
};

export function DocumentVersionHistory({
  isOpen,
  onClose,
  quotationId,
  documentType,
  versions,
  onRestore
}: DocumentVersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const { restoreVersion } = useDocumentFlow(quotationId);

  // Fetch creator names
  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = [...new Set(versions.map(v => v.changed_by).filter(Boolean))];
      if (userIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const map: Record<string, string> = {};
      profiles?.forEach(p => {
        map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
      });
      setProfilesMap(map);
    };

    fetchProfiles();
  }, [versions]);

  const toggleExpand = (versionId: string) => {
    setExpandedVersion(prev => prev === versionId ? null : versionId);
  };

  const handleRestore = async () => {
    if (!restoreConfirmId) return;
    
    setRestoring(true);
    try {
      const success = await restoreVersion(restoreConfirmId);
      if (success) {
        onRestore?.();
      }
    } finally {
      setRestoring(false);
      setRestoreConfirmId(null);
    }
  };

  const formatChanges = (changes: Record<string, { old: any; new: any }>) => {
    return Object.entries(changes).map(([field, { old, new: newVal }]) => ({
      field: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      oldValue: formatValue(old),
      newValue: formatValue(newVal)
    }));
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const documentTypeLabel = documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History - {documentTypeLabel}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No version history available</p>
                </div>
              ) : (
                versions.map((version, index) => {
                  const isLatest = index === 0;
                  const isExpanded = expandedVersion === version.id;
                  const changedBy = version.changed_by ? profilesMap[version.changed_by] || 'Unknown' : 'System';

                  return (
                    <Card 
                      key={version.id}
                      className={cn(
                        "transition-all",
                        isLatest && "ring-2 ring-primary/20"
                      )}
                    >
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                                isLatest 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                V{version.version_number}
                              </div>
                              {index < versions.length - 1 && (
                                <div className="w-0.5 h-4 bg-border mt-2" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Version {version.version_number}</span>
                                {isLatest && (
                                  <Badge variant="default" className="text-xs">Current</Badge>
                                )}
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs", statusColors[version.document_status])}
                                >
                                  {version.document_status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {changedBy}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(version.created_at), 'dd MMM yyyy, HH:mm')}
                                </span>
                              </div>
                              {version.change_reason && (
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                  "{version.change_reason}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleExpand(version.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t">
                            {/* Changes Made */}
                            {version.changes_made && Object.keys(version.changes_made).length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium mb-2">Changes Made:</h5>
                                <div className="space-y-2">
                                  {formatChanges(version.changes_made).map((change, idx) => (
                                    <div 
                                      key={idx}
                                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                                    >
                                      <span className="font-medium">{change.field}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground line-through">
                                          {change.oldValue}
                                        </span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span className="text-primary">{change.newValue}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {version.generated_pdf_path && (
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-1" />
                                  Download PDF
                                </Button>
                              )}
                              {!isLatest && (
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => setRestoreConfirmId(version.id)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Restore This Version
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreConfirmId} onOpenChange={() => setRestoreConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Previous Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new version based on the selected historical version.
              All current changes will be preserved in the version history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Restore Version'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
