import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SystemErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error intercepted by System Guardian:", error, errorInfo);
    
    // Attempt silently logging to external systems here in the future
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRecover = () => {
    // Soft clear cache & reload
    localStorage.removeItem("ncg-app-cache-state");
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-red-100 dark:border-red-900/30">
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
              <div className="h-20 w-20 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  System Interruption
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                  We intercepted an unexpected error to protect your session. It's safe to recover your workspace.
                </p>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="w-full text-left bg-zinc-100 dark:bg-zinc-950 p-4 rounded-md overflow-x-auto text-xs font-mono border text-red-600 dark:text-red-400">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  <p className="mt-2 text-zinc-500 whitespace-pre-wrap">{this.state.error.stack?.substring(0, 300)}...</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                <Button 
                  onClick={this.handleRecover} 
                  className="w-full flex-1"
                  size="lg"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Recover Session
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline" 
                  className="w-full flex-1"
                  size="lg"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-950/50 p-4 text-center border-t text-xs text-zinc-500">
              Error Guardian active. Your data was not compromised.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
