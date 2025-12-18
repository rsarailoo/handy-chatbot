import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Cpu, Shield, FileText, MessageCircle, Pencil, Check, X, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog, type ModelType } from "@/components/settings-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { ConversationSidebar, SidebarTrigger } from "@/components/conversation-sidebar";
import { ChatMessage, TypingIndicator } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { EmptyState } from "@/components/empty-state";
import { BetaBadge } from "@/components/beta-badge";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { apiRequest } from "@/lib/queryClient";
// API Key دیگر از frontend استفاده نمی‌شود
import type { Message, Conversation, DbMessage } from "@shared/schema";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("گفتگوی جدید");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  // API Key از backend می‌آید (از environment variable)
  const [model, setModel] = useState<ModelType>(() => {
    return (localStorage.getItem("openai_model") as ModelType) || "openai/gpt-oss-120b";
  });
  const [systemPrompt, setSystemPrompt] = useState("");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Check if user is admin
  const { data: currentUser } = useQuery({
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

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.style.scrollBehavior = smooth ? "smooth" : "auto";
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        // Reset scroll behavior after scroll
        setTimeout(() => {
          scrollContainer.style.scrollBehavior = "auto";
        }, 500);
      }
    }
  }, []);

  useEffect(() => {
    // Smooth scroll when new messages arrive
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, scrollToBottom]);

  // Fetch conversation messages when active conversation changes
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery<
    Conversation & { messages: DbMessage[] }
  >({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  // Update messages when conversation data loads
  useEffect(() => {
    if (conversationData) {
      setConversationTitle(conversationData.title);
      setSystemPrompt(conversationData.systemPrompt || "");
      setMessages(
        conversationData.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt).getTime(),
        }))
      );
    }
  }, [conversationData]);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        id: crypto.randomUUID(),
        title: "گفتگوی جدید",
        model: model,
      });
      return response.json();
    },
    onSuccess: (data: Conversation) => {
      setActiveConversationId(data.id);
      setConversationTitle(data.title);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
  }, []);

  const streamChat = async (message: string, conversationIdOverride?: string): Promise<void> => {
    setIsStreaming(true);
    const assistantMessageId = crypto.randomUUID();
    setStreamingMessageId(assistantMessageId);
    
      const assistantMessage: Message = {
      id: assistantMessageId,
        role: "assistant",
      content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationId: conversationIdOverride || activeConversationId,
          model,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("خطا در ارسال پیام");
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.trim() === "") continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.done) {
                // Streaming complete
                if (parsed.messageId) {
                  // Update message ID if provided
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, id: parsed.messageId }
                        : msg
                    )
                  );
                }
                break;
              }

              if (parsed.content) {
                // Update message with new chunk
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                );
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
              console.warn("Failed to parse SSE data:", data);
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error: any) {
      if (error.name === "AbortError") {
        // User cancelled, remove the assistant message
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        toast({
          title: "خطا در ارسال پیام",
          description: error.message || "لطفاً دوباره تلاش کنید",
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      // This is now handled directly in handleSendMessage
      return { success: true };
    },
  });

  const handleSendMessage = async (content: string) => {
    // Add user message optimistically
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create conversation if none exists
    if (!activeConversationId) {
      try {
        const response = await apiRequest("POST", "/api/conversations", {
          id: crypto.randomUUID(),
          title: "گفتگوی جدید",
          model: model,
        });
        const newConversation = await response.json();
        setActiveConversationId(newConversation.id);
        setConversationTitle(newConversation.title);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        
        // Use streaming for new conversation
        try {
          await streamChat(content, newConversation.id);
        } catch {
          // Error already handled in streamChat
        }
        return;
      } catch (error: any) {
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        toast({
          title: "خطا",
          description: error.message || "خطا در ایجاد گفتگو",
          variant: "destructive",
        });
        return;
      }
    }

    // Use streaming mutation
    try {
      await streamChat(content, undefined);
    } catch {
      // Error already handled in streamChat
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setConversationTitle("گفتگوی جدید");
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    // Find the message and update it
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.role !== "user") return;

    // Update the message in the UI
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
    );

    // If there's a response after this message, regenerate it
    const nextMessage = messages[messageIndex + 1];
    if (nextMessage && nextMessage.role === "assistant" && activeConversationId) {
      // Remove the assistant response and regenerate
      setMessages((prev) => prev.filter((m, idx) => idx <= messageIndex));
      
      // Regenerate response
      try {
        await streamChat(newContent, activeConversationId);
      } catch (error) {
        toast({
          title: "خطا",
          description: "خطا در بازتولید پاسخ",
          variant: "destructive",
        });
      }
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    // Find the assistant message and the user message before it
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const assistantMessage = messages[messageIndex];
    if (assistantMessage.role !== "assistant") return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== "user") return;

    // Remove the assistant message
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    // Regenerate
    if (activeConversationId) {
      try {
        await streamChat(userMessage.content, activeConversationId);
      } catch (error) {
        toast({
          title: "خطا",
          description: "خطا در بازتولید پاسخ",
          variant: "destructive",
        });
      }
    }
  };

  const [focusSearch, setFocusSearch] = useState(false);

  // Update conversation title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!activeConversationId) throw new Error("No active conversation");
      const res = await apiRequest(`/api/conversations/${activeConversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
      });
      return res;
    },
    onSuccess: (data) => {
      setConversationTitle(data.title);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId] });
      setIsEditingTitle(false);
      toast({
        title: "موفق",
        description: "عنوان گفتگو به‌روزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در به‌روزرسانی عنوان",
        variant: "destructive",
      });
      setEditedTitle(conversationTitle);
    },
  });

  const handleStartEditTitle = () => {
    setEditedTitle(conversationTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== conversationTitle) {
      updateTitleMutation.mutate(editedTitle.trim());
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleCancelEditTitle = () => {
    setEditedTitle(conversationTitle);
    setIsEditingTitle(false);
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("خطا در خروج");
      }
      return res.json();
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      // Invalidate auth query
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Reset state
      setActiveConversationId(null);
      setMessages([]);
      setConversationTitle("گفتگوی جدید");
      // Redirect to login
      setLocation("/login");
      toast({
        title: "موفق",
        description: "با موفقیت خارج شدید",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در خروج از حساب کاربری",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => {
      setIsSidebarOpen(true);
      setFocusSearch(true);
      setTimeout(() => setFocusSearch(false), 100);
    },
    onNewConversation: handleNewConversation,
    onSettings: () => setIsSettingsOpen(true),
  });

  const modelLabels: Record<ModelType, string> = {
    "gpt-3.5-turbo": "GPT-3.5",
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
    "llama-3.1-8b-instant": "Llama 3.1 8B",
    "mixtral-8x7b-32768": "Mixtral 8x7B",
    "gpt-4": "GPT-4",
    "gpt-4-turbo": "GPT-4T",
    "gpt-5": "GPT-5",
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        focusSearch={focusSearch}
        // Props for mobile menu items
        model={model}
        onModelChange={setModel}
        isSettingsOpen={isSettingsOpen}
        onSettingsOpenChange={setIsSettingsOpen}
        messages={messages}
        conversationTitle={conversationTitle}
        currentUser={currentUser}
        onAdminClick={() => setLocation("/admin")}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm relative transition-all duration-300">
          <div className="flex items-center gap-2">
            <SidebarTrigger onClick={() => setIsSidebarOpen(true)} />
            {/* دکمه‌ها فقط در دسکتاپ نمایش داده می‌شوند */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              {activeConversationId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSystemPromptOpen(true)}
                  aria-label="تنظیم System Prompt"
                  className="hover:bg-primary/10 transition-all duration-300 hover-lift hover:scale-105"
                  data-testid="button-system-prompt"
                >
                  <FileText className="h-5 w-5" />
                </Button>
              )}
              <SettingsDialog
                model={model}
                onModelChange={setModel}
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                showModelSelector={true}
                currentUser={currentUser}
              />
              <ExportDialog
                messages={messages}
                conversationTitle={conversationTitle}
                disabled={messages.length === 0}
              />
              {currentUser?.isAdmin === 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/admin")}
                  data-testid="button-admin-panel"
                  aria-label="پنل ادمین"
                  className="hover:bg-primary/10 transition-all duration-300 hover-lift hover:scale-105"
                >
                  <Shield className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* عنوان در وسط صفحه */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            {/* Badge مدل - فعلاً مخفی است، برای فعال کردن false را به true تغییر دهید */}
            {false && (
            <Badge variant="outline" className="text-xs font-normal">
              <Cpu className="h-3 w-3 ml-1" />
              {modelLabels[model]}
            </Badge>
            )}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm" />
                <div className="relative bg-gradient-primary p-2 rounded-full shadow-md ring-2 ring-primary/20">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-border">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") handleCancelEditTitle();
                    }}
                    className="h-7 text-sm font-title min-w-[150px] max-w-[300px]"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={handleSaveTitle}
                    disabled={updateTitleMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={handleCancelEditTitle}
                    disabled={updateTitleMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h1 className="text-base md:text-lg font-title font-semibold text-foreground truncate max-w-[200px] md:max-w-none text-center">
                    {conversationTitle}
                  </h1>
                  {activeConversationId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleStartEditTitle}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <BetaBadge className="hidden md:flex" />
          </div>

          {/* Beta Badge for mobile */}
          <div className="md:hidden">
            <BetaBadge />
          </div>

          <div className="flex items-center justify-end min-w-[96px] gap-2">
            {currentUser ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-3 font-body hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                data-testid="button-logout-header"
              >
                <LogOut className="h-3.5 w-3.5 ml-1.5" />
                {logoutMutation.isPending ? "در حال خروج..." : "خروج"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-3 font-body hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setLocation("/login")}
              >
                ثبت‌نام / ورود
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {messages.length === 0 && !isLoadingConversation ? (
            <EmptyState
              onSuggestionClick={handleSuggestionClick}
              hasApiKey={true}
            />
          ) : (
            <ScrollArea ref={scrollAreaRef} className="h-full smooth-scroll">
              <div className="flex flex-col gap-6 p-4 max-w-4xl mx-auto">
                {messages.map((message, index) => (
                  <div key={message.id} className="animate-message-slide-in" style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}>
                    <ChatMessage
                      message={message}
                      onEdit={handleEditMessage}
                      onRegenerate={handleRegenerateMessage}
                      canEdit={!!activeConversationId}
                      canRegenerate={!!activeConversationId}
                      onSuggestionClick={handleSuggestionClick}
                      showSuggestions={
                        message.role === "assistant" && 
                        index === messages.length - 1 && 
                        !isStreaming &&
                        message.content.length > 50
                      }
                      currentUserId={currentUser?.id}
                    />
                  </div>
                ))}
                {isStreaming && !streamingMessageId && <TypingIndicator />}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="shrink-0 max-w-4xl w-full mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={chatMutation.isPending || isStreaming}
            disabled={false}
            onStop={stopGeneration}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
