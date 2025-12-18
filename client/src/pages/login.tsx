import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BetaBadge } from "@/components/beta-badge";

export default function LoginPage() {
  const [location, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        return res.json();
      }
      return null;
    },
    retry: false,
  });

  useEffect(() => {
    // Check for error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      if (errorParam === "auth_failed") {
        setError("ورود با Google ناموفق بود. لطفاً دوباره تلاش کنید.");
      } else if (errorParam === "callback_error") {
        setError("خطا در پردازش ورود. لطفاً دوباره تلاش کنید.");
      } else if (errorParam === "no_user") {
        setError("خطا در ایجاد حساب کاربری. لطفاً دوباره تلاش کنید.");
      } else if (errorParam === "not_configured") {
        setError("احراز هویت Google تنظیم نشده است. لطفاً با ادمین تماس بگیرید.");
      } else if (errorParam === "db_tables_missing") {
        setError("جداول دیتابیس ایجاد نشده‌اند. لطفاً migration.sql را در Neon Console اجرا کنید.");
      } else if (errorParam === "db_error") {
        setError("خطا در اتصال به دیتابیس. لطفاً لاگ‌های سرور را بررسی کنید.");
      } else if (errorParam === "duplicate_user") {
        setError("کاربری با این ایمیل قبلاً ثبت شده است.");
      }
      // Clear error from URL
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* کوچک بالا برای برچسب ورود/ثبت‌نام */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <BetaBadge />
        <div className="text-xs text-muted-foreground md:text-sm font-body">
          ثبت‌نام / ورود
        </div>
      </div>

      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="relative inline-block mb-4">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl" />
            <div className="relative bg-gradient-primary p-6 rounded-full shadow-2xl ring-4 ring-primary/20">
              <svg className="h-12 w-12 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-title font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            خوش آمدید
          </h1>
          <p className="text-muted-foreground text-base font-body leading-relaxed">
            برای ادامه، لطفاً با حساب Google خود وارد شوید
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-14 text-base font-body shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-background hover:bg-accent border-2 border-border hover:border-primary/50 text-black dark:text-white"
            size="lg"
            data-testid="button-google-login"
          >
            <svg
              className="w-6 h-6 ml-3"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground font-body">
          با ورود، شما شرایط استفاده و حریم خصوصی ما را می‌پذیرید
        </p>
      </div>
    </div>
  );
}

