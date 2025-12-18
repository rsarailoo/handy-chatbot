import { useState, useEffect } from "react";
import { Bot, User, Copy, Check, Edit, RotateCw, Smile } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownMessage } from "./markdown-message";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  isAnimating?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  canEdit?: boolean;
  canRegenerate?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  showSuggestions?: boolean;
  currentUserId?: string | null;
}

const REACTION_EMOJIS = ["👍", "❤️", "😊", "🎉", "🔥", "💡"];

export function ChatMessage({ 
  message, 
  isAnimating = false,
  onEdit,
  onRegenerate,
  canEdit = false,
  canRegenerate = false,
  onSuggestionClick,
  showSuggestions = false,
  currentUserId,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactions, setShowReactions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ["/api/messages", message.id, "reactions"],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${message.id}/reactions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isUser,
  });

  const reactionMutation = useMutation({
    mutationFn: async (reaction: string) => {
      const userReaction = reactions.find((r: any) => r.userId === currentUserId && r.reaction === reaction);
      if (userReaction) {
        await apiRequest("DELETE", `/api/messages/${message.id}/reactions/${encodeURIComponent(reaction)}`);
      } else {
        await apiRequest("POST", `/api/messages/${message.id}/reactions`, { reaction });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", message.id, "reactions"] });
    },
  });

  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc: any, reaction: any) => {
    if (!acc[reaction.reaction]) {
      acc[reaction.reaction] = [];
    }
    acc[reaction.reaction].push(reaction);
    return acc;
  }, {});

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({
        title: "کپی شد",
        description: "پیام در کلیپ‌بورد کپی شد",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در کپی کردن پیام",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    if (isUser && canEdit) {
      setIsEditing(true);
      setEditContent(message.content);
    }
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    if (!isUser && canRegenerate && onRegenerate) {
      onRegenerate(message.id);
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-3 w-full animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <Avatar className={cn(
        "h-9 w-9 shrink-0 ring-2 ring-background shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg",
        isUser ? "bg-gradient-primary ring-primary/20 hover:ring-primary/40" : "bg-gradient-muted ring-muted/20 hover:ring-muted/40"
      )}>
        <AvatarFallback className={cn(
          isUser ? "bg-gradient-primary text-primary-foreground" : "bg-gradient-muted text-muted-foreground"
        )}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1.5 max-w-[85%] md:max-w-[75%] relative",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3 shadow-md transition-all duration-300 hover:shadow-lg hover-lift",
            isUser
              ? "bg-gradient-primary text-primary-foreground rounded-br-md shadow-primary/20 hover:shadow-primary/30"
              : "bg-gradient-muted text-foreground rounded-bl-md shadow-muted/10 hover:shadow-muted/20"
          )}
        >
          {isEditing && isUser ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] bg-background/10 text-foreground border-border/50 resize-none"
                dir="rtl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-7 text-xs"
                >
                  انصراف
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent === message.content}
                  className="h-7 text-xs"
                >
                  ذخیره
                </Button>
              </div>
            </div>
          ) : (
            <>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed font-body" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }} dir="auto">
              {message.content}
            </p>
          ) : (
            <div className="font-body break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              <MarkdownMessage content={message.content} />
            </div>
              )}
              <div className={cn(
                "absolute opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1",
                isUser
                  ? "left-1 top-1"
                  : "right-1 top-1"
              )}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-lg backdrop-blur-sm transition-all duration-300 hover-lift",
                        isUser
                          ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/80 hover:scale-110"
                      )}
                      data-testid={`button-message-menu-${message.id}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isUser ? "start" : "end"} dir="rtl">
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="h-4 w-4 ml-2" />
                      کپی
                    </DropdownMenuItem>
                    {isUser && canEdit && (
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="h-4 w-4 ml-2" />
                        ویرایش
                      </DropdownMenuItem>
                    )}
                    {!isUser && canRegenerate && (
                      <DropdownMenuItem onClick={handleRegenerate}>
                        <RotateCw className="h-4 w-4 ml-2" />
                        بازتولید
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
        
        <span className="text-xs text-muted-foreground px-1 font-body">
          {new Date(message.timestamp).toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        
        {/* Suggested Replies - فقط برای پیام‌های assistant */}
        {!isUser && showSuggestions && onSuggestionClick && message.content && (
          <div className="flex flex-wrap gap-2 mt-2 animate-fade-in">
            {generateSuggestions(message.content).map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick(suggestion)}
                className="text-xs font-body h-7 px-3 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover-lift hover:scale-105"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function generateSuggestions(content: string): string[] {
  // تولید پیشنهادات ساده بر اساس محتوای پیام
  const suggestions: string[] = [];
  
  // اگر پیام سوالی است
  if (content.includes("؟") || content.includes("?") || content.match(/چگونه|چطور|چرا|چه|کی|کجا/)) {
    suggestions.push("توضیح بیشتر بده");
    suggestions.push("مثال بزن");
  }
  
  // اگر پیام درباره کد است
  if (content.includes("کد") || content.includes("code") || content.match(/function|class|const|let|var/)) {
    suggestions.push("کد کامل را بده");
    suggestions.push("توضیح کد را بده");
  }
  
  // پیشنهادات عمومی
  if (suggestions.length === 0) {
    suggestions.push("بیشتر توضیح بده");
    suggestions.push("مثال بزن");
  }
  
  // اگر کمتر از 3 پیشنهاد داریم، پیشنهادات عمومی اضافه می‌کنیم
  if (suggestions.length < 3) {
    const generalSuggestions = ["عالی بود", "ممنون", "ادامه بده"];
    suggestions.push(...generalSuggestions.slice(0, 3 - suggestions.length));
  }
  
  return suggestions.slice(0, 3);
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 w-full animate-fade-in">
      <Avatar className="h-9 w-9 shrink-0 bg-gradient-muted ring-2 ring-muted/20 shadow-md">
        <AvatarFallback className="bg-gradient-muted text-muted-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex items-center gap-1.5 bg-gradient-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-md">
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
