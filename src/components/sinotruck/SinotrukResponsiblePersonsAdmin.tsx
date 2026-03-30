import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

interface ResponsiblePerson {
  id: string;
  name: string;
  phone: string;
  email: string;
  position: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  position: string;
}

export default function SinotrukResponsiblePersonsAdmin() {
  const { toast } = useToast();
  const [persons, setPersons] = useState<ResponsiblePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ResponsiblePerson | null>(null);
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    position: "",
  });

  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    try {
      const { data, error } = await supabase
        .from("sinotruck_responsible_persons")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      setPersons(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading responsible persons",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFormDialog = (person?: ResponsiblePerson) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        phone: person.phone,
        email: person.email,
        position: person.position || "",
      });
    } else {
      setEditingPerson(null);
      setFormData({ name: "", phone: "", email: "", position: "" });
    }
    setShowFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setShowFormDialog(false);
    setEditingPerson(null);
    setFormData({ name: "", phone: "", email: "", position: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPerson) {
        // Update existing person
        const { error } = await supabase
          .from("sinotruck_responsible_persons")
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            position: formData.position || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPerson.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Responsible person updated successfully",
        });
      } else {
        // Create new person
        const { error } = await supabase
          .from("sinotruck_responsible_persons")
          .insert({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            position: formData.position || null,
            is_default: false,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Responsible person created successfully",
        });
      }

      handleCloseFormDialog();
      loadPersons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (personId: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from("sinotruck_responsible_persons")
        .update({ is_default: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Then set the new default
      const { error } = await supabase
        .from("sinotruck_responsible_persons")
        .update({ is_default: true })
        .eq("id", personId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default person updated successfully",
      });
      loadPersons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (personId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("sinotruck_responsible_persons")
        .update({ is_active: !currentStatus })
        .eq("id", personId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Person ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });
      loadPersons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPersonId) return;

    try {
      const { error } = await supabase
        .from("sinotruck_responsible_persons")
        .delete()
        .eq("id", deletingPersonId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Responsible person deleted successfully",
      });
      setShowDeleteDialog(false);
      setDeletingPersonId(null);
      loadPersons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Responsible Persons</h2>
          <p className="text-muted-foreground">
            Manage contact persons for quotations
          </p>
        </div>
        <Button onClick={() => handleOpenFormDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Person
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {persons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No responsible persons found
                </TableCell>
              </TableRow>
            ) : (
              persons.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.position || "-"}</TableCell>
                  <TableCell>{person.phone}</TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={person.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(person.id, person.is_active)
                        }
                      />
                      <Badge variant={person.is_active ? "default" : "secondary"}>
                        {person.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {person.is_default ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(person.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFormDialog(person)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingPersonId(person.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={handleCloseFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPerson ? "Edit Responsible Person" : "Add Responsible Person"}
            </DialogTitle>
            <DialogDescription>
              Enter the contact details for the responsible person
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                placeholder="+94 77 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="person@sinotruck.lk"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseFormDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPerson ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              responsible person from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPersonId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
