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
import { ChevronDown, History, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface QuotationVersion {
  id: string;
  version_number: string;
  edit_type?: string;
  edit_reason?: string;
  is_active_version: boolean;
  created_at: string;
  created_by_name?: string;
}

interface Props {
  currentVersion: QuotationVersion;
  allVersions: QuotationVersion[];
  onViewVersion: (version: QuotationVersion) => void;
  onEditVersion: (version: QuotationVersion) => void;
  showEditOption?: boolean;
}

export function QuotationVersionIndicator({ 
  currentVersion, 
  allVersions, 
  onViewVersion, 
  onEditVersion,
  showEditOption = true
}: Props) {
  // If only one version, show simple badge
  if (allVersions.length <= 1) {
    return (
      <Badge variant="outline" className="text-xs">
        v{currentVersion.version_number}
      </Badge>
    );
  }

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
          <History className="h-3 w-3 mr-1" />
          v{currentVersion.version_number}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Version History</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sortedVersions.map((version) => (
          <DropdownMenuItem key={version.id} className="flex flex-col items-start p-3">
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={version.is_active_version ? "default" : "outline"}
                  className="text-xs"
                >
                  v{version.version_number}
                  {version.is_active_version && " (Active)"}
                </Badge>
                <Badge 
                  variant={getEditTypeVariant(version.edit_type)}
                  className="text-xs"
                >
                  {getEditTypeLabel(version.edit_type)}
                </Badge>
              </div>
              
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewVersion(version);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                
                {showEditOption && version.is_active_version && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditVersion(version);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
              {version.created_by_name && ` • ${version.created_by_name}`}
            </div>
            
            {version.edit_reason && (
              <div className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                {version.edit_reason}
              </div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}