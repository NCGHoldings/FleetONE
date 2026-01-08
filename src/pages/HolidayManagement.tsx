import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Edit, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
  type: string;
  is_mercantile: boolean;
  country: string;
  is_recurring: boolean;
  created_at: string;
}

const HolidayManagement = () => {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    holiday_date: '',
    holiday_name: '',
    type: 'Public',
    is_mercantile: false,
    country: 'LK',
    is_recurring: false,
  });

  // Fetch holidays for selected year
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('holiday_date', `${selectedYear}-01-01`)
        .lte('holiday_date', `${selectedYear}-12-31`)
        .order('holiday_date', { ascending: true });
      
      if (error) throw error;
      return data as Holiday[];
    },
  });

  // Create holiday mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('holidays')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday created successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to create holiday: ' + error.message);
    },
  });

  // Update holiday mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('holidays')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday updated successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to update holiday: ' + error.message);
    },
  });

  // Delete holiday mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete holiday: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      holiday_date: '',
      holiday_name: '',
      type: 'Public',
      is_mercantile: false,
      country: 'LK',
      is_recurring: false,
    });
    setEditingHoliday(null);
  };

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        holiday_date: holiday.holiday_date,
        holiday_name: holiday.holiday_name,
        type: holiday.type,
        is_mercantile: holiday.is_mercantile,
        country: holiday.country,
        is_recurring: holiday.is_recurring,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      deleteMutation.mutate(id);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Holiday Name', 'Type', 'Mercantile', 'Country', 'Recurring'],
      ...holidays.map(h => [
        h.holiday_date,
        h.holiday_name,
        h.type,
        h.is_mercantile ? 'Yes' : 'No',
        h.country,
        h.is_recurring ? 'Yes' : 'No',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holidays-${selectedYear}.csv`;
    a.click();
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Holiday Management</h1>
            <p className="text-muted-foreground">Manage public and mercantile holidays</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selectedYear} Holidays ({holidays.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No holidays found for {selectedYear}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mercantile</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map(holiday => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">
                      {format(new Date(holiday.holiday_date), 'MMM dd, yyyy (EEE)')}
                    </TableCell>
                    <TableCell>{holiday.holiday_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{holiday.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {holiday.is_mercantile ? (
                        <Badge className="bg-blue-100 text-blue-800">Mercantile</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {holiday.is_recurring && <Badge variant="secondary">Recurring</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="holiday_date">Date</Label>
              <Input
                id="holiday_date"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="holiday_name">Holiday Name</Label>
              <Input
                id="holiday_name"
                value={formData.holiday_name}
                onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })}
                placeholder="e.g., Tamil Thai Pongal Day"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Religious">Religious</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_mercantile"
                checked={formData.is_mercantile}
                onCheckedChange={(checked) => setFormData({ ...formData, is_mercantile: checked as boolean })}
              />
              <Label htmlFor="is_mercantile" className="cursor-pointer">
                Mercantile Holiday (Banks/Offices closed)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">
                Recurring (appears every year)
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingHoliday ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HolidayManagement;
