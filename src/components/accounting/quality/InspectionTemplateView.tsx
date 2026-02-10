import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, ClipboardCheck, ChevronDown, ChevronRight, Edit, Trash2, FileText } from "lucide-react";
import { useInspectionTemplates, useInspectionTemplateCriteria, useCreateInspectionTemplate } from "@/hooks/useQualityInspection";
import { useForm, useFieldArray } from "react-hook-form";

export const InspectionTemplateView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("_all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  
  const { data: templates, isLoading } = useInspectionTemplates(typeFilter === "_all" ? undefined : typeFilter);
  const createTemplate = useCreateInspectionTemplate();

  const { register, handleSubmit, reset, control, watch } = useForm({
    defaultValues: {
      template_name: "",
      template_code: "",
      inspection_type: "incoming" as "incoming" | "outgoing" | "in_process",
      criteria: [{ criteria_name: "", criteria_type: "pass_fail", acceptance_criteria: "", is_mandatory: true, sequence: 1 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "criteria",
  });

  const filteredTemplates = templates?.filter(t => 
    t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.template_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTemplates(newExpanded);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "incoming":
        return "Incoming";
      case "outgoing":
        return "Outgoing";
      case "in_process":
        return "In-Process";
      default:
        return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "incoming":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Incoming</Badge>;
      case "outgoing":
        return <Badge className="bg-green-500 hover:bg-green-600">Outgoing</Badge>;
      case "in_process":
        return <Badge className="bg-orange-500 hover:bg-orange-600">In-Process</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const onSubmit = (data: any) => {
    createTemplate.mutate({
      template_name: data.template_name,
      template_code: data.template_code,
      inspection_type: data.inspection_type,
      criteria: data.criteria.map((c: any, index: number) => ({
        ...c,
        sequence: index + 1,
        is_mandatory: c.is_mandatory === "true" || c.is_mandatory === true,
      })),
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Templates</p>
              <p className="text-2xl font-bold">{templates?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Incoming</p>
              <p className="text-2xl font-bold">
                {templates?.filter(t => t.inspection_type === "incoming").length || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Outgoing</p>
              <p className="text-2xl font-bold">
                {templates?.filter(t => t.inspection_type === "outgoing").length || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">In-Process</p>
              <p className="text-2xl font-bold">
                {templates?.filter(t => t.inspection_type === "in_process").length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Types</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
                <SelectItem value="in_process">In-Process</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => {
            reset();
            setIsDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No inspection templates found</p>
            <p className="text-sm mt-2">Create templates to standardize quality inspections</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <TemplateRow 
                key={template.id}
                template={template}
                isExpanded={expandedTemplates.has(template.id)}
                onToggle={() => toggleExpanded(template.id)}
                getTypeBadge={getTypeBadge}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Inspection Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name *</Label>
                <Input 
                  id="template_name" 
                  {...register("template_name", { required: true })} 
                  placeholder="e.g., Raw Material Inspection"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template_code">Template Code</Label>
                <Input 
                  id="template_code" 
                  {...register("template_code")} 
                  placeholder="e.g., QI-001"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="inspection_type">Inspection Type *</Label>
              <Select 
                defaultValue="incoming"
                onValueChange={(value) => register("inspection_type").onChange({ target: { value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming (GRN)</SelectItem>
                  <SelectItem value="outgoing">Outgoing (Delivery)</SelectItem>
                  <SelectItem value="in_process">In-Process</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-semibold">Inspection Criteria</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ 
                    criteria_name: "", 
                    criteria_type: "pass_fail", 
                    acceptance_criteria: "", 
                    is_mandatory: true, 
                    sequence: fields.length + 1 
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Criteria
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Criteria {index + 1}</span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Criteria Name *</Label>
                        <Input 
                          {...register(`criteria.${index}.criteria_name` as const, { required: true })}
                          placeholder="e.g., Visual Inspection"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select 
                          defaultValue="pass_fail"
                          onValueChange={(value) => {
                            register(`criteria.${index}.criteria_type` as const).onChange({ target: { value } });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pass_fail">Pass/Fail</SelectItem>
                            <SelectItem value="numeric">Numeric</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Acceptance Criteria</Label>
                      <Input 
                        {...register(`criteria.${index}.acceptance_criteria` as const)}
                        placeholder="e.g., No visible defects"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-component for expandable template row with criteria
const TemplateRow = ({ template, isExpanded, onToggle, getTypeBadge }: {
  template: any;
  isExpanded: boolean;
  onToggle: () => void;
  getTypeBadge: (type: string) => React.ReactNode;
}) => {
  const { data: criteria } = useInspectionTemplateCriteria(isExpanded ? template.id : "");

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-4">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.template_name}</span>
                  {template.template_code && (
                    <span className="text-sm text-muted-foreground font-mono">
                      ({template.template_code})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {getTypeBadge(template.inspection_type)}
              {template.is_active ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 py-3 bg-muted/30">
            <p className="text-sm font-medium mb-2">Inspection Criteria</p>
            {criteria && criteria.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Criteria Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Acceptance Criteria</TableHead>
                    <TableHead>Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((c: any, index: number) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{c.criteria_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {c.criteria_type === "pass_fail" ? "Pass/Fail" : 
                           c.criteria_type === "numeric" ? "Numeric" : "Text"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.acceptance_criteria || "-"}
                      </TableCell>
                      <TableCell>
                        {c.is_mandatory ? (
                          <Badge className="bg-red-500">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No criteria defined</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
