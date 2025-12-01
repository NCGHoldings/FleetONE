import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface StaffWithSignature {
  user_id: string;
  first_name: string;
  last_name: string;
  signature_data: string;
  avatar_url?: string;
}

interface StaffSignatureSelectorProps {
  value?: string;
  onChange: (userId: string) => void;
  label?: string;
  placeholder?: string;
}

export const StaffSignatureSelector = ({
  value,
  onChange,
  label = 'Select Staff Member',
  placeholder = 'Choose a staff member...',
}: StaffSignatureSelectorProps) => {
  const [staff, setStaff] = useState<StaffWithSignature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaffWithSignatures();
  }, []);

  const loadStaffWithSignatures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, signature_data, avatar_url')
        .not('signature_data', 'is', null)
        .order('first_name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (s: StaffWithSignature) => {
    return `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';
  };

  const selectedStaff = staff.find(s => s.user_id === value);

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : placeholder}>
            {selectedStaff && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedStaff.avatar_url} />
                  <AvatarFallback>
                    {selectedStaff.first_name?.charAt(0)}{selectedStaff.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{getStaffName(selectedStaff)}</span>
                <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Has Signature
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {staff.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No staff members with saved signatures found
            </div>
          ) : (
            staff.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>
                <div className="flex items-center gap-2 py-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={s.avatar_url} />
                    <AvatarFallback>
                      {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{getStaffName(s)}</span>
                  <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Signature
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
