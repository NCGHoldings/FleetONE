import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudgetTemplates } from "@/hooks/useBudgetTemplates";
import { Button } from "@/components/ui/button";
import { Eye, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const TemplateLibrary = () => {
  const { fetchTemplates } = useBudgetTemplates();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["budget_templates"],
    queryFn: () => fetchTemplates(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
        <p className="text-muted-foreground">
          Templates will be seeded automatically. Please contact support if you need assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{template.template_name}</span>
                {template.is_system_template && (
                  <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-1 rounded">
                    System
                  </span>
                )}
              </CardTitle>
              <CardDescription className="capitalize">
                {template.industry_type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {template.description || "No description available"}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
