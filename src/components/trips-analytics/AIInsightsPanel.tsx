import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useAIInsights } from "@/hooks/useAIInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

interface AIInsightsPanelProps {
  analyticsData: any;
}

export default function AIInsightsPanel({ analyticsData }: AIInsightsPanelProps) {
  const { generateInsights, isLoading, insights } = useAIInsights();

  const handleGenerateInsights = (type: "comprehensive" | "profitability" | "efficiency" | "performance" | "risks") => {
    generateInsights(analyticsData, type);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          {insights && (
            <Badge variant="secondary" className="text-xs">
              Generated {insights.timestamp.toLocaleTimeString()}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Get intelligent analysis and recommendations powered by AI
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Type Selection */}
        <Tabs defaultValue="comprehensive" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="comprehensive">All</TabsTrigger>
            <TabsTrigger value="profitability">Profit</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>

          {["comprehensive", "profitability", "efficiency", "performance", "risks"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <Button
                onClick={() => handleGenerateInsights(type as any)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate {type.charAt(0).toUpperCase() + type.slice(1)} Insights
                  </>
                )}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        {/* Insights Display */}
        {insights && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Analysis Results</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGenerateInsights("comprehensive")}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-medium mt-3 mb-2">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-1 my-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm">{children}</li>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm mb-2">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                }}
              >
                {insights.insights}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!insights && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select an analysis type above to generate AI-powered insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
