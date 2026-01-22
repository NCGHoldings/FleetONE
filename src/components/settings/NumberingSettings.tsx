import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Hash, Pencil, RefreshCw } from "lucide-react";
import { useNumberingSequences, useUpdateNumberingSequence, entityTypeLabels, generatePreviewNumber, NumberingSequence } from "@/hooks/useNumbering";

export function NumberingSettings() {
  const { data: sequences, isLoading } = useNumberingSequences();
  const updateSequence = useUpdateNumberingSequence();
  const [editingSequence, setEditingSequence] = useState<NumberingSequence | null>(null);
  const [formData, setFormData] = useState({
    prefix: "",
    include_year: true,
    include_month: false,
    separator: "-",
    padding_length: 4,
    next_number: 1,
  });

  const handleEdit = (sequence: NumberingSequence) => {
    setEditingSequence(sequence);
    setFormData({
      prefix: sequence.prefix,
      include_year: sequence.include_year,
      include_month: sequence.include_month,
      separator: sequence.separator,
      padding_length: sequence.padding_length,
      next_number: sequence.next_number,
    });
  };

  const handleSave = async () => {
    if (!editingSequence) return;
    
    await updateSequence.mutateAsync({
      id: editingSequence.id,
      ...formData,
    });
    
    setEditingSequence(null);
  };

  const getPreview = () => {
    if (!editingSequence) return "";
    return generatePreviewNumber({
      ...editingSequence,
      ...formData,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Auto-Numbering Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic numbering formats for customers, vendors, items, invoices, and other entities.
            Numbers are generated automatically when creating new records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Type</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Format Preview</TableHead>
                <TableHead>Next Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences?.map((seq) => (
                <TableRow key={seq.id}>
                  <TableCell className="font-medium">
                    {entityTypeLabels[seq.entity_type] || seq.entity_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{seq.prefix}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {generatePreviewNumber(seq)}
                  </TableCell>
                  <TableCell>{seq.next_number}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(seq)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!sequences || sequences.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No numbering configurations found. They will be created automatically when needed.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSequence} onOpenChange={(open) => !open && setEditingSequence(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingSequence ? entityTypeLabels[editingSequence.entity_type] : ""} Numbering
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview */}
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Preview</p>
              <p className="text-2xl font-mono font-bold">{getPreview()}</p>
            </div>

            {/* Prefix */}
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input
                id="prefix"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                placeholder="CUST"
                maxLength={10}
              />
            </div>

            {/* Separator */}
            <div className="space-y-2">
              <Label htmlFor="separator">Separator</Label>
              <Select
                value={formData.separator}
                onValueChange={(v) => setFormData({ ...formData, separator: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Hyphen (-)</SelectItem>
                  <SelectItem value="/">Slash (/)</SelectItem>
                  <SelectItem value="_">Underscore (_)</SelectItem>
                  <SelectItem value=".">Dot (.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Year */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Year</Label>
                <p className="text-sm text-muted-foreground">Add current year to the number</p>
              </div>
              <Switch
                checked={formData.include_year}
                onCheckedChange={(v) => setFormData({ ...formData, include_year: v })}
              />
            </div>

            {/* Include Month */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Month</Label>
                <p className="text-sm text-muted-foreground">Add current month after year</p>
              </div>
              <Switch
                checked={formData.include_month}
                onCheckedChange={(v) => setFormData({ ...formData, include_month: v })}
              />
            </div>

            {/* Padding Length */}
            <div className="space-y-2">
              <Label htmlFor="padding">Number Padding (digits)</Label>
              <Select
                value={formData.padding_length.toString()}
                onValueChange={(v) => setFormData({ ...formData, padding_length: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 digits (001)</SelectItem>
                  <SelectItem value="4">4 digits (0001)</SelectItem>
                  <SelectItem value="5">5 digits (00001)</SelectItem>
                  <SelectItem value="6">6 digits (000001)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next Number */}
            <div className="space-y-2">
              <Label htmlFor="next_number">Next Number</Label>
              <Input
                id="next_number"
                type="number"
                min={1}
                value={formData.next_number}
                onChange={(e) => setFormData({ ...formData, next_number: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Warning: Changing this may cause duplicate numbers
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSequence(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateSequence.isPending}>
              {updateSequence.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
