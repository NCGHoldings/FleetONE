import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalData } from '@/hooks/useSignatureManagement';
import { User, Calendar, Pen, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface SignaturePreviewCardProps {
  title: string;
  approvalType: 'prepared_by' | 'checked_by' | 'approved_by';
  approval?: ApprovalData;
  onEdit: () => void;
  showAddButton?: boolean;
}

export const SignaturePreviewCard: React.FC<SignaturePreviewCardProps> = ({
  title,
  approvalType,
  approval,
  onEdit,
  showAddButton = true,
}) => {
  const getStatusColor = () => {
    return approval ? 'default' : 'secondary';
  };

  const getStatusText = () => {
    return approval ? 'Signed' : 'Pending';
  };

  return (
    <Card className="relative transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {approval ? (
          <>
            {/* Approver Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{approval.approver_name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(approval.approval_date), 'dd/MM/yyyy')}</span>
              </div>
            </div>

            {/* Signature Display */}
            {approval.signature_data ? (
              <div className="mt-3">
                <div className="border border-border rounded-md p-2 bg-muted/20">
                  <img 
                    src={approval.signature_data} 
                    alt={`${title} Signature`}
                    className="max-h-16 w-auto mx-auto"
                    style={{ 
                      maxWidth: '100%',
                      objectFit: 'contain',
                      filter: 'contrast(1.1) brightness(0.95)'
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Digital Signature
                </p>
              </div>
            ) : (
              <div className="mt-3 p-3 border border-dashed border-border rounded-md text-center">
                <p className="text-xs text-muted-foreground">
                  Name and date only (no signature)
                </p>
              </div>
            )}

            {/* Edit Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="w-full mt-3 flex items-center gap-2"
            >
              <Pen className="h-3 w-3" />
              Update Signature
            </Button>
          </>
        ) : (
          /* Add Signature Button */
          showAddButton && (
            <div className="py-6 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Signature
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};