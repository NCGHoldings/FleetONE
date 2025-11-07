import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Route {
  id: string;
  route_no: string;
  route_name: string;
  start_location: string;
  end_location: string;
  gl_code: string | null;
}

function suggestGLCode(start: string, end: string): string {
  const extractCode = (location: string) => {
    const firstWord = location.trim().split(' ')[0];
    return firstWord.substring(0, 3).toUpperCase();
  };
  return `${extractCode(start)}-${extractCode(end)}`;
}

export function RouteGLCodesAdmin() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('routes')
        .select('id, route_no, route_name, start_location, end_location, gl_code')
        .order('route_no');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (route: Route) => {
    setEditingId(route.id);
    setEditValue(route.gl_code || '');
  };

  const handleSave = async (routeId: string) => {
    // Normalize: remove spaces and convert to uppercase
    const value = editValue.trim().replace(/\s+/g, '').toUpperCase();
    
    // Validation
    if (value && (value.length > 20 || !/^[A-Z0-9\-]+$/.test(value))) {
      toast.error('GL Code must be max 20 characters, uppercase letters, numbers, and hyphens only');
      return;
    }

    try {
      setSavingId(routeId);
      const { error } = await supabase
        .from('routes')
        .update({ gl_code: value || null })
        .eq('id', routeId);

      if (error) throw error;

      setRoutes(routes.map(r => 
        r.id === routeId ? { ...r, gl_code: value || null } : r
      ));
      setEditingId(null);
      toast.success(`GL Code saved: ${value}`);
    } catch (error: any) {
      console.error('Error updating GL code:', error);
      toast.error('Failed to update GL code');
    } finally {
      setSavingId(null);
    }
  };

  const handleApplySuggestion = async (route: Route) => {
    const suggested = suggestGLCode(route.start_location, route.end_location);
    
    try {
      setSavingId(route.id);
      const { error } = await supabase
        .from('routes')
        .update({ gl_code: suggested })
        .eq('id', route.id);

      if (error) throw error;

      setRoutes(routes.map(r => 
        r.id === route.id ? { ...r, gl_code: suggested } : r
      ));
      toast.success(`Applied: ${suggested}`);
    } catch (error: any) {
      console.error('Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Route GL Codes</h3>
        <p className="text-sm text-muted-foreground">
          Set short codes for each route to appear in GL exports (e.g., COL-BAD, KAN-GAL)
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Route No</TableHead>
              <TableHead className="w-[200px]">Route</TableHead>
              <TableHead className="w-[150px]">GL Code</TableHead>
              <TableHead className="w-[150px]">Suggested</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => {
              const suggested = suggestGLCode(route.start_location, route.end_location);
              const isEditing = editingId === route.id;
              const isSaving = savingId === route.id;

              return (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.route_no}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{route.route_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {route.start_location} → {route.end_location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                        placeholder="e.g., COL-BAD or COL - BAD"
                        maxLength={25}
                        className="h-8 w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(route.id);
                          if (e.key === 'Escape') handleCancel();
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {route.gl_code ? (
                          <Badge variant="outline">{route.gl_code}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      {suggested}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSave(route.id)}
                            disabled={isSaving}
                            className="h-8"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(route)}
                            disabled={isSaving}
                            className="h-8"
                          >
                            Edit
                          </Button>
                          {route.gl_code !== suggested && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApplySuggestion(route)}
                              disabled={isSaving}
                              className="h-8"
                              title="Apply suggested code"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="pt-4 border-t">
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Guidelines:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Max 20 characters</li>
            <li>Spaces will be automatically removed (COL - BAD → COL-BAD)</li>
            <li>Use uppercase letters, numbers, and hyphens only</li>
            <li>Keep codes short and meaningful (e.g., COL-BAD, KAN-GAL)</li>
            <li>Click "Apply" (✨) to use auto-suggested codes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
