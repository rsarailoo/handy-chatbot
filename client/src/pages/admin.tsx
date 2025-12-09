import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  ShieldCheck,
  BarChart3,
  Loader2,
  Search,
  Trash2,
  Eye,
  Key,
  Plus,
  Edit,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Stats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  adminUsers: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  isAdmin: number;
  createdAt: string;
}

interface Conversation {
  id: string;
  userId: string | null;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface Settings {
  openaiApiKeySet: boolean;
  googleOAuthSet: boolean;
}

interface ApiKey {
  id: string;
  provider: string;
  apiKey: string; // masked
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [apiKeyProvider, setApiKeyProvider] = useState("");
  const [apiKeyValue, setApiKeyValue] = useState("");

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) throw new Error("خطا در دریافت آمار");
      return res.json();
    },
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("خطا در دریافت کاربران");
      return res.json();
    },
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/admin/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("خطا در دریافت گفتگوها");
      return res.json();
    },
  });

  // Fetch settings
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("خطا در دریافت تنظیمات");
      return res.json();
    },
  });

  // Fetch API keys
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-keys", { credentials: "include" });
      if (!res.ok) throw new Error("خطا در دریافت API Keys");
      return res.json();
    },
  });

  // Toggle admin status
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "موفق",
        description: "وضعیت ادمین با موفقیت تغییر کرد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در تغییر وضعیت ادمین",
        variant: "destructive",
      });
    },
  });

  // API Key mutations
  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }) => {
      await apiRequest("POST", "/api/admin/api-keys", { provider, apiKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setApiKeyDialogOpen(false);
      setApiKeyProvider("");
      setApiKeyValue("");
      setSelectedApiKey(null);
      toast({
        title: "موفق",
        description: "API Key با موفقیت ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ذخیره API Key",
        variant: "destructive",
      });
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ id, apiKey, isActive }: { id: string; apiKey?: string; isActive?: boolean }) => {
      await apiRequest("PATCH", `/api/admin/api-keys/${id}`, { apiKey, isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "موفق",
        description: "API Key با موفقیت به‌روزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در به‌روزرسانی API Key",
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "موفق",
        description: "API Key با موفقیت حذف شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در حذف API Key",
        variant: "destructive",
      });
    },
  });

  const handleOpenApiKeyDialog = (apiKey?: ApiKey) => {
    if (apiKey) {
      setSelectedApiKey(apiKey);
      setApiKeyProvider(apiKey.provider);
      setApiKeyValue("");
    } else {
      setSelectedApiKey(null);
      setApiKeyProvider("");
      setApiKeyValue("");
    }
    setApiKeyDialogOpen(true);
  };

  const handleSaveApiKey = () => {
    if (!apiKeyProvider || !apiKeyValue) {
      toast({
        title: "خطا",
        description: "لطفاً provider و API Key را وارد کنید",
        variant: "destructive",
      });
      return;
    }
    saveApiKeyMutation.mutate({ provider: apiKeyProvider, apiKey: apiKeyValue });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-title font-bold">پنل مدیریت</h1>
              <p className="text-sm text-muted-foreground font-body mt-1">مدیریت کامل سیستم</p>
            </div>
            <Badge variant="outline" className="gap-2 px-3 py-1.5 shadow-md border-primary/20">
              <Shield className="h-4 w-4" />
              ادمین
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-title font-semibold">کل کاربران</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-3xl font-title font-bold">{stats?.totalUsers || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-title font-semibold">کل گفتگوها</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-3xl font-title font-bold">{stats?.totalConversations || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-title font-semibold">کل پیام‌ها</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-3xl font-title font-bold">{stats?.totalMessages || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-title font-semibold">کاربران ادمین</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-3xl font-title font-bold">{stats?.adminUsers || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">کاربران</TabsTrigger>
            <TabsTrigger value="conversations">گفتگوها</TabsTrigger>
            <TabsTrigger value="settings">تنظیمات</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="font-title font-bold">مدیریت کاربران</CardTitle>
                <CardDescription className="font-body">مشاهده و مدیریت تمام کاربران سیستم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو کاربر..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9"
                      dir="rtl"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>کاربر</TableHead>
                        <TableHead>ایمیل</TableHead>
                        <TableHead>نقش</TableHead>
                        <TableHead>تاریخ عضویت</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            کاربری یافت نشد
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.picture || undefined} />
                                  <AvatarFallback>
                                    {user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {user.isAdmin === 1 ? (
                                <Badge variant="default" className="gap-1">
                                  <Shield className="h-3 w-3" />
                                  ادمین
                                </Badge>
                              ) : (
                                <Badge variant="outline">کاربر</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toggleAdminMutation.mutate({
                                    userId: user.id,
                                    isAdmin: user.isAdmin !== 1,
                                  });
                                }}
                                disabled={toggleAdminMutation.isPending}
                              >
                                {user.isAdmin === 1 ? (
                                  <>
                                    <Shield className="h-4 w-4 ml-2" />
                                    حذف ادمین
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-4 w-4 ml-2" />
                                    تبدیل به ادمین
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-4">
            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="font-title font-bold">تمام گفتگوها</CardTitle>
                <CardDescription className="font-body">مشاهده تمام گفتگوهای سیستم</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>عنوان</TableHead>
                        <TableHead>مدل</TableHead>
                        <TableHead>کاربر</TableHead>
                        <TableHead>تاریخ ایجاد</TableHead>
                        <TableHead>آخرین بروزرسانی</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : conversations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            گفتگویی یافت نشد
                          </TableCell>
                        </TableRow>
                      ) : (
                        conversations.map((conv) => {
                          const user = users.find((u) => u.id === conv.userId);
                          return (
                            <TableRow key={conv.id}>
                              <TableCell className="font-medium">{conv.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{conv.model}</Badge>
                              </TableCell>
                              <TableCell>
                                {user ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={user.picture || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {user.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{user.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">نامشخص</span>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(conv.createdAt)}</TableCell>
                              <TableCell>{formatDate(conv.updatedAt)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-title font-bold">مدیریت API Keys</CardTitle>
                    <CardDescription className="font-body">تنظیم و مدیریت کلیدهای API سرویس‌های هوش مصنوعی</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenApiKeyDialog()} className="font-body shadow-md hover:shadow-lg transition-all duration-200">
                    <Plus className="h-4 w-4 ml-2" />
                    افزودن API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>هیچ API Key تنظیم نشده است</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((apiKey) => (
                      <div
                        key={apiKey.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Key className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium capitalize">{apiKey.provider}</p>
                              <Badge variant={apiKey.isActive === 1 ? "default" : "secondary"}>
                                {apiKey.isActive === 1 ? "فعال" : "غیرفعال"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {apiKey.apiKey}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={apiKey.isActive === 1}
                            onCheckedChange={(checked) => {
                              updateApiKeyMutation.mutate({ id: apiKey.id, isActive: checked });
                            }}
                            disabled={updateApiKeyMutation.isPending}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenApiKeyDialog(apiKey)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("آیا از حذف این API Key مطمئن هستید؟")) {
                                deleteApiKeyMutation.mutate(apiKey.id);
                              }
                            }}
                            disabled={deleteApiKeyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="font-title font-bold">تنظیمات سیستم</CardTitle>
                <CardDescription className="font-body">وضعیت تنظیمات و پیکربندی</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Google OAuth</p>
                        <p className="text-sm text-muted-foreground">
                          تنظیمات احراز هویت Google
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">فعال</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedApiKey ? "ویرایش API Key" : "افزودن API Key جدید"}
            </DialogTitle>
            <DialogDescription>
              کلید API را برای یکی از سرویس‌های هوش مصنوعی وارد کنید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">سرویس</Label>
              <Select
                value={apiKeyProvider}
                onValueChange={setApiKeyProvider}
                disabled={!!selectedApiKey}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="انتخاب سرویس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                  <SelectItem value="mistral">Mistral AI</SelectItem>
                  <SelectItem value="cohere">Cohere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApiKeyDialogOpen(false);
                setApiKeyProvider("");
                setApiKeyValue("");
                setSelectedApiKey(null);
              }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKeyProvider || !apiKeyValue || saveApiKeyMutation.isPending}
            >
              {saveApiKeyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                "ذخیره"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

