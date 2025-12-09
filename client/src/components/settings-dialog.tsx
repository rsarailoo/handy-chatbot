import { useState, useEffect } from "react";
import { Settings, Check, Loader2, Cpu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export type ModelType = "gpt-3.5-turbo" | "gpt-4" | "gpt-4-turbo" | "gpt-5" | "openai/gpt-oss-120b" | "llama-3.3-70b-versatile" | "llama-3.1-8b-instant" | "mixtral-8x7b-32768";

interface SettingsDialogProps {
  model: ModelType;
  onModelChange: (model: ModelType) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showModelSelector?: boolean; // برای مخفی کردن انتخاب مدل
  currentUser?: { isAdmin?: number } | null; // برای نمایش دکمه تبدیل به ادمین
  buttonClassName?: string;
  buttonVariant?: "ghost" | "outline" | "default" | "destructive" | "secondary" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  hideTrigger?: boolean; // برای مخفی کردن دکمه trigger
}

const modelOptions: { value: ModelType; label: string; description: string }[] = [
  { value: "openai/gpt-oss-120b", label: "GPT-OSS-120B (Groq)", description: "قدرتمندترین - پیشنهادی" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)", description: "سریع و قدرتمند" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Groq)", description: "سریع‌ترین" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Groq)", description: "قدرتمند و سریع" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "سریع و اقتصادی" },
  { value: "gpt-4", label: "GPT-4", description: "هوشمندتر، کندتر" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "هوشمند و سریع" },
  { value: "gpt-5", label: "GPT-5", description: "جدیدترین و قوی‌ترین" },
];

export function SettingsDialog({ 
  model, 
  onModelChange,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
  showModelSelector = false, // پیش‌فرض مخفی است
  currentUser,
  buttonClassName = "",
  buttonVariant = "ghost",
  buttonSize = "icon",
  showLabel = false,
  hideTrigger = false,
}: SettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onControlledOpenChange || setInternalOpen;
  const [selectedModel, setSelectedModel] = useState<ModelType>(model);
  const [isSaving, setIsSaving] = useState(false);
  const [isMakingAdmin, setIsMakingAdmin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSelectedModel(model);
    }
  }, [open, model]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
    onModelChange(selectedModel);
    localStorage.setItem("openai_model", selectedModel);
    
    setIsSaving(false);
    setOpen(false);
    
    toast({
      title: "ذخیره شد",
      description: "تنظیمات با موفقیت ذخیره شد",
    });
    } catch (error: any) {
      setIsSaving(false);
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره تنظیمات",
        variant: "destructive",
      });
    }
  };

  const handleMakeAdmin = async () => {
    setIsMakingAdmin(true);
    try {
      const res = await fetch("/api/auth/make-admin", {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "خطا در تبدیل به ادمین");
      }

      const data = await res.json();
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "موفق",
        description: data.message || "شما به ادمین تبدیل شدید",
      });
      
      setOpen(false);
      
      // Reload page to show admin icon
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در تبدیل به ادمین",
        variant: "destructive",
      });
    } finally {
      setIsMakingAdmin(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            data-testid="button-settings"
            aria-label="تنظیمات"
            className={buttonClassName}
          >
            <Settings className={showLabel ? "h-4 w-4 ml-2" : "h-5 w-5"} />
            {showLabel && "تنظیمات"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="h-5 w-5 text-primary" />
            تنظیمات
          </DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            {showModelSelector ? "مدل هوش مصنوعی را تنظیم کنید" : "تنظیمات"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Model Selection Section - فقط اگر showModelSelector true باشد */}
          {showModelSelector && (
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              مدل هوش مصنوعی
            </Label>
            <Select
              value={selectedModel}
              onValueChange={(value) => setSelectedModel(value as ModelType)}
            >
              <SelectTrigger id="model" data-testid="select-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {modelOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    data-testid={`model-option-${option.value}`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {showModelSelector && (
          <Button
            onClick={handleSave}
              disabled={isSaving}
            className="w-full"
            data-testid="button-save-settings"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 ml-2" />
                ذخیره تنظیمات
              </>
            )}
          </Button>
          )}

          {!showModelSelector && (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground py-4">
                تنظیمات از طریق پنل ادمین انجام می‌شود
              </div>
            </div>
          )}

          {/* دکمه تبدیل به ادمین - همیشه نمایش داده می‌شود (فقط برای کاربرانی که ادمین نیستند) */}
          {currentUser && currentUser.isAdmin !== 1 && (
            <div className="border-t pt-4">
              <Button
                onClick={handleMakeAdmin}
                disabled={isMakingAdmin}
                variant="outline"
                className="w-full"
              >
                {isMakingAdmin ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    در حال تبدیل...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 ml-2" />
                    تبدیل به ادمین
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                برای دسترسی به پنل مدیریت، روی این دکمه کلیک کنید
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
