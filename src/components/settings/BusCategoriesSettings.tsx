import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusCategories } from "@/hooks/useBusCategories";
import { Bus, GraduationCap, Star, Plus, Trash2, RefreshCw, Route, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<any>> = {
  'bus': Bus,
  'graduation-cap': GraduationCap,
  'star': Star,
  'tag': Tag
};

const colorClasses: Record<string, string> = {
  'public_bus': 'from-blue-500 to-blue-600',
  'school_bus': 'from-purple-500 to-purple-600',
  'special_hire': 'from-emerald-500 to-emerald-600',
};

export function BusCategoriesSettings() {
  const { 
    categories, 
    subCategories, 
    routeRules, 
    loadingCategories,
    getSubCategoriesForCategory,
    addRouteRule,
    deleteRouteRule,
    rerunAutoAssignment
  } = useBusCategories();
  
  const [isRunningAssignment, setIsRunningAssignment] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    route_pattern: '',
    category_id: '',
    sub_category_id: ''
  });

  const handleRunAutoAssignment = async () => {
    setIsRunningAssignment(true);
    await rerunAutoAssignment();
    setIsRunningAssignment(false);
  };

  const handleAddRule = () => {
    if (!newRule.route_pattern || !newRule.category_id) return;
    
    addRouteRule({
      route_pattern: newRule.route_pattern,
      category_id: newRule.category_id,
      sub_category_id: newRule.sub_category_id || null,
      priority: 10,
      is_active: true
    });
    
    setNewRule({ route_pattern: '', category_id: '', sub_category_id: '' });
    setAddRuleOpen(false);
  };

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
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => {
              const IconComponent = iconMap[category.icon] || Bus;
              const gradient = colorClasses[category.code] || 'from-gray-500 to-gray-600';
              
              return (
                <Card key={category.id} className="relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", gradient)} />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", gradient)}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      {category.name}
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
                    {category.code === 'public_bus' && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Sub-categories:</p>
                        <div className="flex flex-wrap gap-1">
                          {getSubCategoriesForCategory(category.id).map(sub => (
                            <Badge key={sub.id} variant="outline" className="text-xs">
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
            <CardHeader>
              <CardTitle>Public Bus Sub-Categories</CardTitle>
              <CardDescription>
                Sub-categories for the Public Bus category to classify different service levels
              </CardDescription>
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
                      <Badge variant="secondary">
                        {sub.bus_count} buses
                      </Badge>
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
                  Configure patterns to automatically assign buses to categories based on their routes
                </CardDescription>
              </div>
              <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Route Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Route Pattern (use % as wildcard)</Label>
                      <Input 
                        placeholder="e.g., %Jaffna%" 
                        value={newRule.route_pattern}
                        onChange={(e) => setNewRule({ ...newRule, route_pattern: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use SQL LIKE syntax: %Jaffna% matches any route containing "Jaffna"
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={newRule.category_id}
                        onValueChange={(v) => setNewRule({ ...newRule, category_id: v, sub_category_id: '' })}
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
                    {newRule.category_id && getSubCategoriesForCategory(newRule.category_id).length > 0 && (
                      <div className="space-y-2">
                        <Label>Sub-Category (optional)</Label>
                        <Select 
                          value={newRule.sub_category_id}
                          onValueChange={(v) => setNewRule({ ...newRule, sub_category_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-category" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSubCategoriesForCategory(newRule.category_id).map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={handleAddRule} className="w-full">Add Rule</Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                          <span className="text-sm text-muted-foreground">
                            {rule.matched_buses_count} matches
                          </span>
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
    </div>
  );
}
