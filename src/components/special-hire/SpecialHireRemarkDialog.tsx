import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Phone, UserCheck, StickyNote, CalendarClock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SpecialHireRemarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  quotationNo: string;
  customerName: string;
}

const REMARK_TYPES = [
  { value: 'call_note', label: 'Call Note', icon: Phone, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'customer_feedback', label: 'Customer Feedback', icon: UserCheck, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'internal_note', label: 'Internal Note', icon: StickyNote, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'follow_up', label: 'Follow Up', icon: CalendarClock, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
];

export function SpecialHireRemarkDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNo,
  customerName,
}: SpecialHireRemarkDialogProps) {
  const [content, setContent] = useState('');
  const [remarkType, setRemarkType] = useState('call_note');
  const queryClient = useQueryClient();

  const { data: remarks = [], isLoading } = useQuery({
    queryKey: ['special-hire-remarks', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_hire_remarks')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const addRemark = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('special_hire_remarks').insert({
        quotation_id: quotationId,
        remark_type: remarkType,
        content: content.trim(),
        created_by: user?.id || null,
        created_by_name: user?.email?.split('@')[0] || 'Unknown',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['special-hire-remarks', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['special-hire-remark-summaries'] });
      toast.success('Remark added');
    },
    onError: () => toast.error('Failed to add remark'),
  });

  const getTypeConfig = (type: string) =>
    REMARK_TYPES.find(t => t.value === type) || REMARK_TYPES[2];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Remarks — {quotationNo}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{customerName}</p>
        </DialogHeader>

        {/* Remark List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[340px] pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : remarks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No remarks yet. Add one below.
            </div>
          ) : (
            <div className="space-y-3">
              {remarks.map((r: any) => {
                const config = getTypeConfig(r.remark_type);
                const Icon = config.icon;
                return (
                  <div key={r.id} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={`text-[10px] ${config.color}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{r.content}</p>
                    <p className="text-[10px] text-muted-foreground">
                      by {r.created_by_name || 'Unknown'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Add Remark Form */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex gap-2">
            <Select value={remarkType} onValueChange={setRemarkType}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMARK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a remark..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
            <Button
              size="sm"
              className="h-auto px-3"
              disabled={!content.trim() || addRemark.isPending}
              onClick={() => addRemark.mutate()}
            >
              {addRemark.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
