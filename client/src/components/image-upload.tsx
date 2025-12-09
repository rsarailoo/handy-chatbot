import { useState, useRef } from "react";
import { Image, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageSelect: (file: File, url: string) => void;
  onImageRemove: () => void;
  selectedImage: File | null;
  previewUrl: string | null;
  disabled?: boolean;
}

export function ImageUpload({
  onImageSelect,
  onImageRemove,
  selectedImage,
  previewUrl,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "فرمت فایل نامعتبر",
        description: "فقط تصاویر JPG, PNG, GIF, WebP مجاز هستند",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "حجم فایل زیاد است",
        description: "حداکثر حجم فایل 10 مگابایت است",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    onImageSelect(file, preview);

    // Upload file to server
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "خطا در آپلود فایل");
      }

      const data = await response.json();
      // Replace preview URL with server URL
      onImageSelect(file, data.url);
    } catch (error: any) {
      toast({
        title: "خطا در آپلود",
        description: error.message || "لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
      onImageRemove();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      {previewUrl ? (
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-32 object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={cn(
            "h-10 w-10 rounded-xl transition-all duration-300 hover-lift",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label="آپلود تصویر"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Image className="h-5 w-5" />
          )}
        </Button>
      )}
    </div>
  );
}

