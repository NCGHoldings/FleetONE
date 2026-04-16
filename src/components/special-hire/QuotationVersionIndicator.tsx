import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, History, Eye, Edit, Check } from 'lucide-react';
import { format } from 'date-fns';

interface QuotationVersion {
  id: string;
  version_number: string;
  edit_type?: string;
  edit_reason?: string;
  is_active_version: boolean;
  created_at: string;
  created_by_name?: string;
  parent_quotation_id?: string;
}

interface Props {
  currentVersion: QuotationVersion;
  allVersions: QuotationVersion[];
  onViewVersion: (version: QuotationVersion) => void;
  onEditVersion: (version: QuotationVersion) => void;
  onLoadVersions?: () => Promise<void>;
  onSetActiveVersion?: (version: QuotationVersion) => void;
  showEditOption?: boolean;
}

export function QuotationVersionIndicator({ 
  currentVersion, 
  allVersions, 
  onViewVersion, 
  onEditVersion,
  onLoadVersions,
  onSetActiveVersion,
  showEditOption = true
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleOpenChange = async (open: boolean) => {
    if (open && allVersions.length === 0 && onLoadVersions) {
      setIsLoading(true);
      await onLoadVersions();
      setIsLoading(false);
    }
  };

  // Always show as clickable to make version history discoverable
  const hasMultipleVersions = allVersions.length > 1;
  const versionCount = allVersions.length;

  // Sort versions by version number
  const sortedVersions = [...allVersions].sort((a, b) => {
    const aVersion = a.version_number.split('.').map(Number);
    const bVersion = b.version_number.split('.').map(Number);
    
    if (aVersion[0] !== bVersion[0]) return bVersion[0] - aVersion[0];
    return bVersion[1] - aVersion[1];
  });

  const getEditTypeLabel = (editType?: string) => {
    switch (editType) {
      case 'staff_edit':
        return 'Staff Edit';
      case 'customer_request':
        return 'Customer Request';
      default:
        return 'Original';
    }
  };

  const getEditTypeVariant = (editType?: string) => {
    switch (editType) {
      case 'staff_edit':
        return 'secondary';
      case 'customer_request':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-3 text-xs gap-1.5 hover:bg-accent" 
          disabled={isLoading}
        >
          <History className="h-3.5 w-3.5" />
          <span className="font-medium">v{currentVersion.version_number}</span>
          {hasMultipleVersions && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
              {versionCount}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Version History
          <Badge variant="outline" className="ml-auto text-xs">
            {versionCount} {versionCount === 1 ? 'version' : 'versions'}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading version history...
            </div>
          </div>
        ) : sortedVersions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-xs text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-20" />
            <p>No version history available</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {sortedVersions.map((version, index) => (
              <DropdownMenuItem 
                key={version.id} 
                className="flex flex-col items-start p-3 cursor-default focus:bg-accent/50"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={version.is_active_version ? "default" : "outline"}
                      className="text-xs font-semibold"
                    >
                      v{version.version_number}
                      {version.is_active_version && " • Active"}
                    </Badge>
                    <Badge 
                      variant={getEditTypeVariant(version.edit_type)}
                      className="text-xs"
                    >
                      {getEditTypeLabel(version.edit_type)}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewVersion(version);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    
                    {showEditOption && version.is_active_version && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditVersion(version);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                    
                    {!version.is_active_version && onSetActiveVersion && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-green-100 text-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetActiveVersion(version);
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Set Active
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="font-medium">
                    {format(new Date(version.created_at), 'MMM dd, yyyy')}
                  </span>
                  <span>at</span>
                  <span>{format(new Date(version.created_at), 'HH:mm')}</span>
                  {version.created_by_name && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="text-foreground/70">{version.created_by_name}</span>
                    </>
                  )}
                </div>
                
                {version.edit_reason && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-accent/30 rounded w-full">
                    <span className="font-medium text-foreground/70">Reason: </span>
                    {version.edit_reason}
                  </div>
                )}
                
                {index < sortedVersions.length - 1 && (
                  <div className="w-full h-px bg-border mt-3" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}