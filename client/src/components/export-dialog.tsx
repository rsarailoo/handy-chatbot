import { useState } from "react";
import { Download, FileText, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface ExportDialogProps {
  messages: Message[];
  conversationTitle: string;
  disabled?: boolean;
  buttonClassName?: string;
  buttonVariant?: "ghost" | "outline" | "default" | "destructive" | "secondary" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

type ExportFormat = "text" | "json" | "markdown";

export function ExportDialog({ 
  messages, 
  conversationTitle, 
  disabled = false,
  buttonClassName = "",
  buttonVariant = "ghost",
  buttonSize = "icon",
  showLabel = false,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportAsText = () => {
    let content = `گفتگو: ${conversationTitle}\n`;
    content += `تاریخ: ${new Date().toLocaleDateString("fa-IR")}\n`;
    content += "═".repeat(50) + "\n\n";

    messages.forEach((msg) => {
      const role = msg.role === "user" ? "شما" : "دستیار";
      const time = new Date(msg.timestamp).toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      content += `[${time}] ${role}:\n${msg.content}\n\n`;
    });

    return content;
  };

  const exportAsMarkdown = () => {
    let content = `# ${conversationTitle}\n\n`;
    content += `> تاریخ: ${new Date().toLocaleDateString("fa-IR")}\n\n`;
    content += "---\n\n";

    messages.forEach((msg) => {
      const role = msg.role === "user" ? "**شما**" : "**دستیار**";
      const time = new Date(msg.timestamp).toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      content += `### ${role} (${time})\n\n${msg.content}\n\n---\n\n`;
    });

    return content;
  };

  const exportAsJson = () => {
    return JSON.stringify(
      {
        title: conversationTitle,
        exportDate: new Date().toISOString(),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toISOString(),
        })),
      },
      null,
      2
    );
  };

  const handleExport = async (format: ExportFormat) => {
    if (messages.length === 0) {
      toast({
        title: "خطا",
        description: "پیامی برای خروجی گرفتن وجود ندارد",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case "text":
          content = exportAsText();
          filename = `chat-${Date.now()}.txt`;
          mimeType = "text/plain;charset=utf-8";
          break;
        case "markdown":
          content = exportAsMarkdown();
          filename = `chat-${Date.now()}.md`;
          mimeType = "text/markdown;charset=utf-8";
          break;
        case "json":
          content = exportAsJson();
          filename = `chat-${Date.now()}.json`;
          mimeType = "application/json;charset=utf-8";
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "خروجی گرفته شد",
        description: `فایل ${filename} دانلود شد`,
      });

      setOpen(false);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در خروجی گرفتن",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled || messages.length === 0}
          data-testid="button-export"
          aria-label="خروجی گفتگو"
          className={buttonClassName}
        >
          <Download className={showLabel ? "h-4 w-4 ml-2" : "h-5 w-5"} />
          {showLabel && "خروجی گرفتن"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Download className="h-5 w-5 text-primary" />
            خروجی گفتگو
          </DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            فرمت فایل خروجی را انتخاب کنید
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-4">
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => handleExport("text")}
            disabled={isExporting}
            data-testid="button-export-text"
          >
            <FileText className="h-5 w-5 ml-3 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium">متن ساده</div>
              <div className="text-xs text-muted-foreground">فایل .txt</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => handleExport("markdown")}
            disabled={isExporting}
            data-testid="button-export-markdown"
          >
            <FileText className="h-5 w-5 ml-3 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium">مارک‌داون</div>
              <div className="text-xs text-muted-foreground">فایل .md</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => handleExport("json")}
            disabled={isExporting}
            data-testid="button-export-json"
          >
            <FileJson className="h-5 w-5 ml-3 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium">JSON</div>
              <div className="text-xs text-muted-foreground">فایل .json</div>
            </div>
          </Button>
        </div>

        {isExporting && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
