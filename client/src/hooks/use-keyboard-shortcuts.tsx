import { useEffect } from "react";

interface KeyboardShortcuts {
  onSearch?: () => void;
  onNewConversation?: () => void;
  onSettings?: () => void;
}

export function useKeyboardShortcuts({
  onSearch,
  onNewConversation,
  onSettings,
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Don't trigger shortcuts when typing
        if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
          // Allow Ctrl/Cmd+K for search even in inputs
          e.preventDefault();
          onSearch?.();
        }
        return;
      }

      // Ctrl/Cmd + K: Search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onSearch?.();
      }

      // Ctrl/Cmd + N: New conversation
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewConversation?.();
      }

      // Ctrl/Cmd + ,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        onSettings?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearch, onNewConversation, onSettings]);
}

