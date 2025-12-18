import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetaBadgeProps {
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

export function BetaBadge({ className, variant = "secondary" }: BetaBadgeProps) {
  return (
    <Badge 
      variant={variant}
      className={cn(
        "text-xs font-medium px-2 py-0.5 gap-1.5",
        "bg-gradient-to-r from-primary/10 to-primary/5",
        "border-primary/20 text-primary",
        "hover:from-primary/20 hover:to-primary/10",
        "transition-all duration-200",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span className="font-title">نسخه آزمایشی</span>
    </Badge>
  );
}

