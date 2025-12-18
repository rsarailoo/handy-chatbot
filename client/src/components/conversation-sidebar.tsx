import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MessageSquarePlus, 
  MessageSquare, 
  Trash2, 
  MoreHorizontal,
  Loader2,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  Settings,
  Download,
  Shield,
  Pin,
  PinOff,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, Folder as FolderType } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog, type ModelType } from "@/components/settings-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { useTheme } from "@/components/theme-provider";
import type { Message } from "@shared/schema";

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start font-body hover:bg-sidebar-accent"
      aria-label={theme === "light" ? "فعال‌سازی حالت تاریک" : "فعال‌سازی حالت روشن"}
    >
      {theme === "light" ? (
        <>
          <Moon className="h-4 w-4 ml-2" />
          حالت تاریک
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 ml-2" />
          حالت روشن
        </>
      )}
    </Button>
  );
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  focusSearch?: boolean;
  // Props for mobile menu items
  model?: ModelType;
  onModelChange?: (model: ModelType) => void;
  isSettingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  messages?: Message[];
  conversationTitle?: string;
  currentUser?: any;
  onAdminClick?: () => void;
}

export function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  isMobileOpen,
  onMobileClose,
  focusSearch = false,
  model,
  onModelChange,
  isSettingsOpen,
  onSettingsOpenChange,
  messages,
  conversationTitle,
  currentUser,
  onAdminClick,
}: ConversationSidebarProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const { toast } = useToast();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", searchQuery, selectedFolderId, showArchived],
    queryFn: async () => {
      let url = "/api/conversations";
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }
      if (selectedFolderId !== undefined) {
        params.append("folderId", selectedFolderId === null ? "null" : selectedFolderId);
      }
      if (showArchived) {
        params.append("archived", "true");
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("خطا در دریافت گفتگوها");
      return res.json();
    },
  });

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("خطا در دریافت پوشه‌ها");
      return res.json();
    },
  });

  useEffect(() => {
    if (focusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [focusSearch]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
    if (activeConversationId === id) {
      onNewConversation();
    }
  };

  const pinMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/conversations/${id}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/conversations/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/folders", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setIsFolderDialogOpen(false);
      setNewFolderName("");
      toast({
        title: "موفق",
        description: "پوشه با موفقیت ایجاد شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ایجاد پوشه",
        variant: "destructive",
      });
    },
  });

  const moveToFolderMutation = useMutation({
    mutationFn: async ({ conversationId, folderId }: { conversationId: string; folderId: string | null }) => {
      await apiRequest("PATCH", `/api/conversations/${conversationId}`, { folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }) => {
      await apiRequest("PATCH", `/api/conversations/${conversationId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setEditingConversationId(null);
      setEditedTitle("");
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
    },
  });

  const handleStartEditTitle = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConversationId(conversation.id);
    setEditedTitle(conversation.title);
  };

  const handleSaveTitle = () => {
    if (editingConversationId && editedTitle.trim()) {
      updateTitleMutation.mutate({ conversationId: editingConversationId, title: editedTitle.trim() });
    }
  };

  const handleCancelEditTitle = () => {
    setEditingConversationId(null);
    setEditedTitle("");
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "امروز";
    if (days === 1) return "دیروز";
    if (days < 7) return `${days} روز پیش`;
    return d.toLocaleDateString("fa-IR");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 right-0 z-50 w-72 bg-sidebar/95 backdrop-blur-xl border-l border-sidebar-border/50 flex flex-col transition-all duration-300 md:translate-x-0 shadow-xl md:shadow-none",
          isMobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-3 border-b border-sidebar-border/50 space-y-2 bg-sidebar/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMobileClose}
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="جستجو در گفتگوها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-sm font-body border-sidebar-border/50 focus:border-primary/50 transition-colors"
              dir="rtl"
              data-testid="input-search-conversations"
            />
          </div>
          
          {/* Mobile Menu Items - فقط در موبایل نمایش داده می‌شوند */}
          <div className="md:hidden pt-2 space-y-1 border-t border-sidebar-border/50 mt-2">
            {onSettingsOpenChange && model && onModelChange && (
              <SettingsDialog
                model={model}
                onModelChange={onModelChange}
                open={isSettingsOpen || false}
                onOpenChange={onSettingsOpenChange}
                showModelSelector={false}
                currentUser={currentUser}
                buttonVariant="ghost"
                buttonSize="sm"
                showLabel={true}
                buttonClassName="w-full justify-start font-body hover:bg-sidebar-accent"
              />
            )}
            {messages && conversationTitle && (
              <ExportDialog
                messages={messages}
                conversationTitle={conversationTitle}
                disabled={messages.length === 0}
                buttonVariant="ghost"
                buttonSize="sm"
                showLabel={true}
                buttonClassName="w-full justify-start font-body hover:bg-sidebar-accent"
              />
            )}
            <div className="space-y-1">
              <ThemeToggleButton />
              {currentUser?.isAdmin === 1 && onAdminClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onAdminClick();
                    onMobileClose();
                  }}
                  className="w-full justify-start font-body hover:bg-sidebar-accent"
                  aria-label="پنل ادمین"
                >
                  <Shield className="h-4 w-4 ml-2" />
                  پنل ادمین
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Folders Section */}
            <div className="mb-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-title font-semibold text-muted-foreground uppercase">پوشه‌ها</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsFolderDialogOpen(true)}
                  data-testid="button-create-folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-0.5">
                <div
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-sidebar-accent/50",
                    selectedFolderId === null ? "bg-sidebar-accent" : ""
                  )}
                  onClick={() => {
                    setSelectedFolderId(null);
                    setSearchQuery("");
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-body text-sidebar-foreground">بدون پوشه</span>
                </div>
                {folders.map((folder) => (
                  <div key={folder.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-sidebar-accent/50 group",
                        selectedFolderId === folder.id ? "bg-sidebar-accent" : ""
                      )}
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setSearchQuery("");
                        if (!expandedFolders.has(folder.id)) {
                          toggleFolder(folder.id);
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFolder(folder.id);
                        }}
                        className="p-0.5 hover:bg-sidebar-accent rounded"
                      >
                        {expandedFolders.has(folder.id) ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-body text-sidebar-foreground flex-1 truncate">{folder.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-sidebar-border/50 my-2" />

            {/* Conversations Section */}
            <div className="mb-1">
              <span className="text-xs font-title font-semibold text-muted-foreground uppercase px-2">گفتگوها</span>
            </div>
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm font-body">
                هنوز گفتگویی ندارید
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover-elevate",
                    activeConversationId === conversation.id
                      ? "bg-gradient-accent text-sidebar-accent-foreground shadow-md ring-2 ring-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    onMobileClose();
                  }}
                  data-testid={`conversation-${conversation.id}`}
                >
                  {conversation.isPinned === 1 ? (
                    <Pin className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-200 fill-current",
                      activeConversationId === conversation.id
                        ? "text-sidebar-accent-foreground"
                        : "text-primary"
                    )} />
                  ) : (
                    <MessageSquare className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-200",
                      activeConversationId === conversation.id
                        ? "text-sidebar-accent-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )} />
                  )}
                  <div className="flex-1 min-w-0">
                    {editingConversationId === conversation.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTitle();
                            if (e.key === "Escape") handleCancelEditTitle();
                          }}
                          className="h-7 text-sm font-title flex-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveTitle();
                          }}
                          disabled={updateTitleMutation.isPending}
                        >
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEditTitle();
                          }}
                          disabled={updateTitleMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm truncate font-title font-medium">{conversation.title}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          {formatDate(conversation.updatedAt)}
                        </p>
                      </>
                    )}
                  </div>
                  
                  {editingConversationId !== conversation.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-conversation-menu-${conversation.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" dir="rtl">
                        <DropdownMenuItem
                          onClick={(e) => handleStartEditTitle(conversation, e)}
                          data-testid={`button-edit-title-${conversation.id}`}
                        >
                          <Pencil className="h-4 w-4 ml-2" />
                          تغییر عنوان
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            pinMutation.mutate(conversation.id);
                          }}
                          data-testid={`button-pin-conversation-${conversation.id}`}
                        >
                          {conversation.isPinned === 1 ? (
                            <>
                              <PinOff className="h-4 w-4 ml-2" />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin className="h-4 w-4 ml-2" />
                              Pin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={(e) => handleDelete(conversation.id, e as any)}
                          data-testid={`button-delete-conversation-${conversation.id}`}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* دکمه گفتگوی جدید در پایین سایدبار */}
        <div className="p-3 border-t border-sidebar-border/50 bg-sidebar/50 backdrop-blur-sm">
          <Button
            onClick={() => {
              onNewConversation();
              onMobileClose();
            }}
            className="w-full font-title shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            data-testid="button-new-conversation"
          >
            <MessageSquarePlus className="h-4 w-4 ml-2" />
            گفتگوی جدید
          </Button>
        </div>
      </aside>

      {/* Create Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-title">ایجاد پوشه جدید</DialogTitle>
            <DialogDescription className="font-body">
              یک پوشه برای سازماندهی گفتگوهای خود ایجاد کنید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name" className="font-body">نام پوشه</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="مثلاً: کار، پروژه‌ها، یادگیری..."
                className="font-body"
                dir="rtl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    createFolderMutation.mutate(newFolderName.trim());
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFolderDialogOpen(false);
                setNewFolderName("");
              }}
              className="font-body"
            >
              انصراف
            </Button>
            <Button
              onClick={() => {
                if (newFolderName.trim()) {
                  createFolderMutation.mutate(newFolderName.trim());
                }
              }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="font-body"
            >
              {createFolderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  در حال ایجاد...
                </>
              ) : (
                "ایجاد"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={onClick}
      data-testid="button-open-sidebar"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
