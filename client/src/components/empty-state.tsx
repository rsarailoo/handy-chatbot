import { MessageCircle, Sparkles, Code, Lightbulb, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
  hasApiKey: boolean;
}

const suggestions = [
  {
    icon: Sparkles,
    title: "ایده‌پردازی",
    text: "برای یک اپلیکیشن موبایل جدید ایده بده",
  },
  {
    icon: Code,
    title: "کدنویسی",
    text: "یک تابع برای مرتب‌سازی آرایه در جاوااسکریپت بنویس",
  },
  {
    icon: Lightbulb,
    title: "توضیح مفهوم",
    text: "هوش مصنوعی چیست و چگونه کار می‌کند؟",
  },
  {
    icon: BookOpen,
    title: "خلاصه‌سازی",
    text: "یک متن طولانی را برایم خلاصه کن",
  },
];

export function EmptyState({ onSuggestionClick, hasApiKey }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="absolute -inset-6 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl" />
        <div className="relative bg-gradient-primary p-8 rounded-full shadow-2xl ring-4 ring-primary/20">
          <MessageCircle className="h-16 w-16 text-primary-foreground" />
        </div>
      </div>

      <h1 className="text-3xl font-title font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        سلام! من دستیار هوشمند شما هستم
      </h1>
      
      <p className="text-muted-foreground text-base max-w-md mb-10 font-body leading-relaxed">
        {hasApiKey
          ? "هر سوالی دارید بپرسید. من اینجا هستم که کمکتان کنم."
          : "برای شروع، لطفاً کلید API خود را از بخش تنظیمات وارد کنید."}
      </p>

      {hasApiKey && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {suggestions.map((suggestion, index) => (
            <Card
              key={suggestion.title}
              className="group p-5 hover-elevate cursor-pointer transition-all duration-300 border-border/50 hover:border-primary/30 hover:shadow-lg hover:scale-[1.02] bg-card/50 backdrop-blur-sm hover-lift"
              onClick={() => onSuggestionClick(suggestion.text)}
              data-testid={`suggestion-${suggestion.title}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4 text-right">
                <div className="shrink-0 p-3 rounded-xl bg-gradient-muted group-hover:bg-gradient-primary transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110">
                  <suggestion.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-title font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors duration-300">{suggestion.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 font-body leading-relaxed">
                    {suggestion.text}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!hasApiKey && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gradient-muted px-5 py-3 rounded-xl shadow-md border border-border/50 font-body">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>روی آیکون تنظیمات در بالا کلیک کنید</span>
        </div>
      )}
    </div>
  );
}
