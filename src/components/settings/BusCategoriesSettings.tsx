import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBusCategories, BusCategory, BusSubCategory, BusRouteRule } from "@/hooks/useBusCategories";
import { CategoryBusListPreview } from "./CategoryBusListPreview";
import { Bus, GraduationCap, Star, Plus, Trash2, RefreshCw, Route, Loader2, Tag, Edit, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<any>> = {
  'bus': Bus,
  'graduation-cap': GraduationCap,
  'star': Star,
  'tag': Tag
};

const iconOptions = [
  { value: 'bus', label: 'Bus' },
  { value: 'graduation-cap', label: 'Graduation Cap' },
  { value: 'star', label: 'Star' },
  { value: 'tag', label: 'Tag' }
];

// Category-specific color options for sub-categories
const categoryColorFamilies: Record<string, Array<{ value: string; label: string }>> = {
  'public_bus': [
    { value: '#4F46E5', label: 'Indigo (Premium)' },
    { value: '#3B82F6', label: 'Blue (Standard)' },
    { value: '#06B6D4', label: 'Cyan (Economy)' },
    { value: '#0EA5E9', label: 'Sky' },
  ],
  'school_bus': [
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#A855F7', label: 'Violet' },
    { value: '#D946EF', label: 'Fuchsia' },
  ],
  'special_hire': [
    { value: '#10B981', label: 'Emerald' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#22C55E', label: 'Green' },
  ],
};

const defaultColorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#06B6D4', label: 'Cyan' },
];

const colorClasses: Record<string, string> = {
  'public_bus': 'from-blue-500 to-blue-600',
  'school_bus': 'from-purple-500 to-purple-600',
  'special_hire': 'from-emerald-500 to-emerald-600',
};

// Sub-category specific gradient classes
const subCategoryGradients: Record<string, Record<string, string>> = {
  'public_bus': {
    'super_luxury': 'from-indigo-500 to-indigo-600',
    'semi_luxury': 'from-blue-500 to-blue-600',
    'leyland': 'from-cyan-500 to-cyan-600',
  },
};

export function BusCategoriesSettings() {
  const { 
    categories, 
    subCategories, 
    routeRules, 
    loadingCategories,
    getSubCategoriesForCategory,
    getBusesForCategory,
    getBusesForSubCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addRouteRule,
    updateRouteRule,
    deleteRouteRule,
    rerunAutoAssignment
  } = useBusCategories();
  
  const [isRunningAssignment, setIsRunningAssignment] = useState(false);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BusCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '', color: '#3B82F6', icon: 'bus' });
  
  // Sub-category dialog state
  const [subCategoryDialogOpen, setSubCategoryDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<BusSubCategory | null>(null);
  const [subCategoryForm, setSubCategoryForm] = useState({ name: '', code: '', description: '', color: '#3B82F6', category_id: '' });
  
  // Route rule dialog state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BusRouteRule | null>(null);
  const [ruleForm, setRuleForm] = useState({ route_pattern: '', category_id: '', sub_category_id: '' });
  
  // Bus preview state
  const [busPreviewOpen, setBusPreviewOpen] = useState(false);
  const [busPreviewTitle, setBusPreviewTitle] = useState('');
  const [busPreviewSubtitle, setBusPreviewSubtitle] = useState('');
  const [busPreviewColor, setBusPreviewColor] = useState('');
  const [busPreviewFetch, setBusPreviewFetch] = useState<() => Promise<any>>(() => async () => []);

  const handleRunAutoAssignment = async () => {
    setIsRunningAssignment(true);
    await rerunAutoAssignment();
    setIsRunningAssignment(false);
  };

  // Category handlers
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', code: '', description: '', color: '#3B82F6', icon: 'bus' });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: BusCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ 
      name: cat.name, 
      code: cat.code, 
      description: cat.description || '', 
      color: cat.color, 
      icon: cat.icon 
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name || !categoryForm.code) return;
    
    if (editingCategory) {
      updateCategory({ id: editingCategory.id, data: categoryForm });
    } else {
      addCategory(categoryForm);
    }
    setCategoryDialogOpen(false);
  };

  // Sub-category handlers
  const openAddSubCategory = (categoryId?: string) => {
    setEditingSubCategory(null);
    setSubCategoryForm({ name: '', code: '', description: '', color: '#3B82F6', category_id: categoryId || '' });
    setSubCategoryDialogOpen(true);
  };

  const openEditSubCategory = (sub: BusSubCategory) => {
    setEditingSubCategory(sub);
    setSubCategoryForm({ 
      name: sub.name, 
      code: sub.code, 
      description: sub.description || '', 
      color: sub.color || '#3B82F6', 
      category_id: sub.category_id 
    });
    setSubCategoryDialogOpen(true);
  };

  const handleSaveSubCategory = () => {
    if (!subCategoryForm.name || !subCategoryForm.code || !subCategoryForm.category_id) return;
    
    if (editingSubCategory) {
      updateSubCategory({ id: editingSubCategory.id, data: subCategoryForm });
    } else {
      addSubCategory(subCategoryForm);
    }
    setSubCategoryDialogOpen(false);
  };

  // Route rule handlers
  const openAddRule = () => {
    setEditingRule(null);
    setRuleForm({ route_pattern: '', category_id: '', sub_category_id: '' });
    setRuleDialogOpen(true);
  };

  const openEditRule = (rule: BusRouteRule) => {
    setEditingRule(rule);
    setRuleForm({ 
      route_pattern: rule.route_pattern, 
      category_id: rule.category_id, 
      sub_category_id: rule.sub_category_id || '' 
    });
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!ruleForm.route_pattern || !ruleForm.category_id) return;
    
    if (editingRule) {
      updateRouteRule({ 
        id: editingRule.id, 
        data: { 
          route_pattern: ruleForm.route_pattern, 
          category_id: ruleForm.category_id,
          sub_category_id: ruleForm.sub_category_id || null
        } 
      });
    } else {
      addRouteRule({
        route_pattern: ruleForm.route_pattern,
        category_id: ruleForm.category_id,
        sub_category_id: ruleForm.sub_category_id || null,
        priority: 10,
        is_active: true
      });
    }
    setRuleDialogOpen(false);
  };

  // Bus preview handlers
  const openCategoryBusPreview = useCallback((cat: BusCategory) => {
    setBusPreviewTitle(cat.name);
    setBusPreviewSubtitle(`${cat.bus_count || 0} buses assigned`);
    setBusPreviewColor(cat.color);
    setBusPreviewFetch(() => () => getBusesForCategory(cat.id));
    setBusPreviewOpen(true);
  }, [getBusesForCategory]);

  const openSubCategoryBusPreview = useCallback((sub: BusSubCategory) => {
    const parentCat = categories.find(c => c.id === sub.category_id);
    setBusPreviewTitle(`${parentCat?.name} | ${sub.name}`);
    setBusPreviewSubtitle(`${sub.bus_count || 0} buses assigned`);
    setBusPreviewColor(sub.color || parentCat?.color || '#6B7280');
    setBusPreviewFetch(() => () => getBusesForSubCategory(sub.id));
    setBusPreviewOpen(true);
  }, [categories, getBusesForSubCategory]);

  if (loadingCategories) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={handleRunAutoAssignment}
          disabled={isRunningAssignment}
        >
          {isRunningAssignment ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Re-run Auto-Assignment
        </Button>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sub-categories">Sub-Categories</TabsTrigger>
          <TabsTrigger value="route-rules">Route Rules</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddCategory} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => {
              const IconComponent = iconMap[category.icon] || Bus;
              const gradient = colorClasses[category.code] || 'from-gray-500 to-gray-600';
              
              return (
                <Card key={category.id} className="relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", gradient)} />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-lg">
                        <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", gradient)}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        {category.name}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openCategoryBusPreview(category)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the category "{category.name}" and all its sub-categories. 
                                {category.bus_count && category.bus_count > 0 && (
                                  <span className="block mt-2 text-amber-600">
                                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                                    {category.bus_count} buses will be unassigned.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCategory(category.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Buses assigned:</span>
                      <Badge variant="secondary" className="text-lg font-semibold">
                        {category.bus_count}
                      </Badge>
                    </div>
                    {getSubCategoriesForCategory(category.id).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Sub-categories:</p>
                        <div className="flex flex-wrap gap-1">
                          {getSubCategoriesForCategory(category.id).map(sub => (
                            <Badge 
                              key={sub.id} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-accent"
                              onClick={() => openSubCategoryBusPreview(sub)}
                            >
                              {sub.name} ({sub.bus_count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Sub-Categories Tab */}
        <TabsContent value="sub-categories" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sub-Categories</CardTitle>
                <CardDescription>
                  Sub-categories to classify different service levels within main categories
                </CardDescription>
              </div>
              <Button onClick={() => openAddSubCategory()} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Sub-Category
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subCategories.map((sub) => {
                  const parentCategory = categories.find(c => c.id === sub.category_id);
                  return (
                    <div 
                      key={sub.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: sub.color || '#6B7280' }}
                        />
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {parentCategory?.name} • {sub.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => openSubCategoryBusPreview(sub)}
                        >
                          {sub.bus_count} buses
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => openSubCategoryBusPreview(sub)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditSubCategory(sub)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Sub-Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete "{sub.name}".
                                {sub.bus_count && sub.bus_count > 0 && (
                                  <span className="block mt-2 text-amber-600">
                                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                                    {sub.bus_count} buses will lose their sub-category assignment.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSubCategory(sub.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Route Rules Tab */}
        <TabsContent value="route-rules" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Auto-Assignment Route Rules
                </CardTitle>
                <CardDescription>
                  Configure patterns to automatically assign buses to categories based on their actual trip routes
                </CardDescription>
              </div>
              <Button onClick={openAddRule} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {routeRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No route rules configured</p>
                  <p className="text-sm">Add rules to auto-assign buses based on route patterns</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {routeRules.map((rule) => {
                    const category = categories.find(c => c.id === rule.category_id);
                    const subCategory = subCategories.find(s => s.id === rule.sub_category_id);
                    
                    return (
                      <div 
                        key={rule.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                            {rule.route_pattern}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {category?.name}
                              {subCategory && ` | ${subCategory.name}`}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {rule.matched_buses_count} matches
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => openEditRule(rule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteRouteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category details' : 'Create a new bus category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="e.g., Public Bus" 
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input 
                placeholder="e.g., public_bus" 
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description" 
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={categoryForm.icon} onValueChange={(v) => setCategoryForm({ ...categoryForm, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={categoryForm.color} onValueChange={(v) => setCategoryForm({ ...categoryForm, color: v })}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: categoryForm.color }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {defaultColorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.value }} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Category Dialog */}
      <Dialog open={subCategoryDialogOpen} onOpenChange={setSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? 'Edit Sub-Category' : 'Add Sub-Category'}</DialogTitle>
            <DialogDescription>
              {editingSubCategory ? 'Update sub-category details' : 'Create a new sub-category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select 
                value={subCategoryForm.category_id}
                onValueChange={(v) => setSubCategoryForm({ ...subCategoryForm, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="e.g., Super Luxury" 
                value={subCategoryForm.name}
                onChange={(e) => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input 
                placeholder="e.g., super_luxury" 
                value={subCategoryForm.code}
                onChange={(e) => setSubCategoryForm({ ...subCategoryForm, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description" 
                value={subCategoryForm.description}
                onChange={(e) => setSubCategoryForm({ ...subCategoryForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={subCategoryForm.color} onValueChange={(v) => setSubCategoryForm({ ...subCategoryForm, color: v })}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: subCategoryForm.color }} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const parentCat = categories.find(c => c.id === subCategoryForm.category_id);
                    const colorOpts = parentCat?.code && categoryColorFamilies[parentCat.code] 
                      ? categoryColorFamilies[parentCat.code] 
                      : defaultColorOptions;
                    return colorOpts.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.value }} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Route Rule' : 'Add Route Rule'}</DialogTitle>
            <DialogDescription>
              Configure a pattern to auto-assign buses based on their actual trip routes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Route Pattern (use % as wildcard)</Label>
              <Input 
                placeholder="e.g., %Jaffna%" 
                value={ruleForm.route_pattern}
                onChange={(e) => setRuleForm({ ...ruleForm, route_pattern: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use SQL LIKE syntax: %Jaffna% matches any route containing "Jaffna"
              </p>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={ruleForm.category_id}
                onValueChange={(v) => setRuleForm({ ...ruleForm, category_id: v, sub_category_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ruleForm.category_id && getSubCategoriesForCategory(ruleForm.category_id).length > 0 && (
              <div className="space-y-2">
                <Label>Sub-Category (optional)</Label>
                <Select 
                  value={ruleForm.sub_category_id}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, sub_category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubCategoriesForCategory(ruleForm.category_id).map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bus List Preview */}
      <CategoryBusListPreview
        open={busPreviewOpen}
        onOpenChange={setBusPreviewOpen}
        title={busPreviewTitle}
        subtitle={busPreviewSubtitle}
        color={busPreviewColor}
        fetchBuses={busPreviewFetch}
      />
    </div>
  );
}
