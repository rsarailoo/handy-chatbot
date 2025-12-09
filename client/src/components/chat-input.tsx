import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  onStop?: () => void;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled = false, onStop, isStreaming = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !isLoading && !disabled) {
      onSend(trimmed);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex items-end gap-2 p-4 border-t border-border/50">
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "ابتدا کلید API را تنظیم کنید..." : "پیام خود را بنویسید..."}
          className="min-h-[48px] max-h-[150px] resize-none pr-4 pl-12 py-3 text-base rounded-2xl border-input/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 font-body shadow-sm hover:shadow-md focus-visible:shadow-lg"
          disabled={isLoading || disabled}
          dir="rtl"
          data-testid="input-message"
        />
        {isStreaming && onStop ? (
          <Button
            type="button"
            size="icon"
            onClick={onStop}
            className="absolute left-2 bottom-1.5 rounded-xl bg-destructive hover:bg-destructive/90 hover:shadow-lg hover:scale-110 transition-all duration-200 shadow-md"
            data-testid="button-stop-generation"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || disabled}
            className="absolute left-2 bottom-1.5 rounded-xl bg-gradient-primary hover:shadow-lg hover:scale-110 transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
            data-testid="button-send-message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
