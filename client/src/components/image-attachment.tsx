import { useState } from "react";
import { X, ZoomIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageAttachmentProps {
  url: string;
  alt?: string;
  className?: string;
}

export function ImageAttachment({ url, alt = "Image", className }: ImageAttachmentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };

  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;

  if (error) {
    return (
      <div className={cn("flex items-center justify-center p-4 bg-muted rounded-lg", className)}>
        <p className="text-sm text-muted-foreground">خطا در بارگذاری تصویر</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative group rounded-lg overflow-hidden border border-border bg-muted", className)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <img
          src={fullUrl}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            "w-full h-auto max-h-96 object-contain transition-opacity duration-300 cursor-pointer hover:opacity-90",
            isLoading && "opacity-0"
          )}
          onClick={() => setIsLightboxOpen(true)}
          loading="lazy"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 text-foreground"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="relative max-w-[90vw] max-h-[90vh] p-4">
            <img
              src={fullUrl}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}

