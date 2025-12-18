import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Component stack:", errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Alert className="max-w-md" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>خطایی رخ داد</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                متأسفانه خطایی در برنامه رخ داد. لطفاً صفحه را رفرش کنید یا دوباره تلاش کنید.
              </p>
              {this.state.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium mb-1">
                    جزئیات خطا
                  </summary>
                  <pre className="text-xs bg-destructive/10 p-2 rounded mt-1 overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تلاش مجدد
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

