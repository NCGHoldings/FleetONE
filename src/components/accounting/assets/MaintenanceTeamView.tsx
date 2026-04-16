import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Edit, Trash2, UserCheck } from "lucide-react";
import { useMaintenanceTeams, useCreateMaintenanceTeam, useUpdateMaintenanceTeam } from "@/hooks/useAssetMaintenance";
import { useForm } from "react-hook-form";

export const MaintenanceTeamView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  
  const { data: teams, isLoading } = useMaintenanceTeams();
  const createTeam = useCreateMaintenanceTeam();
  const updateTeam = useUpdateMaintenanceTeam();

  const { register, handleSubmit, reset, setValue } = useForm();

  const filteredTeams = teams?.filter(t => 
    t.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.team_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = (data: any) => {
    const teamData = {
      team_name: data.team_name,
      team_code: data.team_code,
      team_lead: data.team_lead,
      team_members: data.team_members ? data.team_members.split(",").map((m: string) => m.trim()) : [],
    };

    if (editingTeam) {
      updateTeam.mutate({ id: editingTeam.id, ...teamData }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingTeam(null);
          reset();
        }
      });
    } else {
      createTeam.mutate(teamData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          reset();
        }
      });
    }
  };

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    setValue("team_name", team.team_name);
    setValue("team_code", team.team_code || "");
    setValue("team_lead", team.team_lead || "");
    setValue("team_members", team.team_members?.join(", ") || "");
    setIsDialogOpen(true);
  };

  const handleDeactivate = (team: any) => {
    updateTeam.mutate({ id: team.id, is_active: false });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Teams</p>
              <p className="text-2xl font-bold">{teams?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Teams</p>
              <p className="text-2xl font-bold">{teams?.filter(t => t.is_active).length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">
                {teams?.reduce((sum, t) => sum + (t.team_members?.length || 0), 0) || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => {
            setEditingTeam(null);
            reset();
            setIsDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No maintenance teams found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Code</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-mono">{team.team_code || "-"}</TableCell>
                  <TableCell className="font-medium">{team.team_name}</TableCell>
                  <TableCell>{team.team_lead || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{team.team_members?.length || 0} members</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {team.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(team)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive"
                        onClick={() => handleDeactivate(team)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add/Edit Team Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Add Maintenance Team"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">Team Name *</Label>
                <Input 
                  id="team_name" 
                  {...register("team_name", { required: true })} 
                  placeholder="e.g., HVAC Maintenance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_code">Team Code</Label>
                <Input 
                  id="team_code" 
                  {...register("team_code")} 
                  placeholder="e.g., MT-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_lead">Team Lead</Label>
              <Input 
                id="team_lead" 
                {...register("team_lead")} 
                placeholder="Enter team lead name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_members">Team Members</Label>
              <Textarea 
                id="team_members" 
                {...register("team_members")} 
                placeholder="Enter member names separated by commas"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple members with commas
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTeam.isPending || updateTeam.isPending}>
                {(createTeam.isPending || updateTeam.isPending) ? "Saving..." : (editingTeam ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
