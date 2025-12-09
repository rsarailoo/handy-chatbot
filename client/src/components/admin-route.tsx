import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        return res.json();
      }
      if (res.status === 401) {
        return null;
      }
      throw new Error("خطا در بررسی احراز هویت");
    },
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);
      if (!user) {
        setLocation("/login");
      } else if (user.isAdmin !== 1) {
        // User is logged in but not admin
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation]);

  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطا</AlertTitle>
          <AlertDescription>
            خطایی در بررسی دسترسی رخ داد. لطفاً دوباره تلاش کنید.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user || user.isAdmin !== 1) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>دسترسی محدود</AlertTitle>
          <AlertDescription>
            شما دسترسی ادمین ندارید. فقط کاربران ادمین می‌توانند به این بخش دسترسی داشته باشند.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

