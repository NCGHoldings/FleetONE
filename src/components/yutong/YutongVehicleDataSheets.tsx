import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Grid3X3, List, MoreHorizontal, Eye, Trash2, Ship, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react';
import { useYutongVehicleDataManagement, VehicleDataSheet } from '@/hooks/useYutongVehicleDataManagement';
import { format } from 'date-fns';

interface Props {
  onRefresh: () => void;
}

export function YutongVehicleDataSheets({ onRefresh }: Props) {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [sheets, setSheets] = useState<VehicleDataSheet[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { fetchDataSheets, deleteDataSheet, isLoading } = useYutongVehicleDataManagement();

  const loadSheets = async () => {
    const data = await fetchDataSheets();
    setSheets(data);
  };

  useEffect(() => {
    loadSheets();
  }, []);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDataSheet(deleteId);
      setDeleteId(null);
      loadSheets();
      onRefresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'processed':
        return <Badge className="bg-blue-500">Processed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading && sheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Uploaded Data Sheets</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSheets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {sheets.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No data sheets uploaded yet</p>
          <p className="text-sm text-muted-foreground">Upload an Excel or CSV file to get started</p>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sheet Name</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.map(sheet => (
                <TableRow key={sheet.id}>
                  <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{sheet.file_name}</TableCell>
                  <TableCell>
                    {sheet.shipment_group ? (
                      <Badge variant="outline" className="gap-1">
                        <Ship className="h-3 w-3" />
                        {sheet.shipment_group.shipment_number}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{sheet.total_vehicles}</TableCell>
                  <TableCell>
                    <span className="text-green-600">{sheet.matched_vehicles}</span>
                    <span className="text-muted-foreground"> / {sheet.total_vehicles}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(sheet.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(sheet.upload_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Vehicles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(sheet.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map(sheet => (
            <Card key={sheet.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-base">{sheet.sheet_name}</CardTitle>
                  </div>
                  {getStatusBadge(sheet.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground truncate">{sheet.file_name}</p>
                
                {sheet.shipment_group && (
                  <Badge variant="outline" className="gap-1">
                    <Ship className="h-3 w-3" />
                    {sheet.shipment_group.shipment_number}
                  </Badge>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vehicles</span>
                  <span className="font-medium">{sheet.total_vehicles}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Matched</span>
                  <span>
                    <span className="text-green-600 font-medium">{sheet.matched_vehicles}</span>
                    <span className="text-muted-foreground"> / {sheet.total_vehicles}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(sheet.matched_vehicles / sheet.total_vehicles) * 100}%` }}
                  />
                </div>

                <div className="text-xs text-muted-foreground">
                  Uploaded {format(new Date(sheet.upload_date), 'MMM dd, yyyy')}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(sheet.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the data sheet and all associated vehicle records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
