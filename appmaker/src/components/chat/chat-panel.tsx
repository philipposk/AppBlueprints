"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Maximize2, Minimize2, ChevronUp, ChevronDown } from "lucide-react";

import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";
import type { MessageImage } from "@/lib/types";
import { ChatComposer } from "./chat-composer";

export const ChatPanel = () => {
  const messages = useAppStore((state) => state.messages);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position to show/hide scroll indicators and auto-scroll to bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollTop(scrollTop > 50);
      setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 50);
    };

    checkScroll();
    container.addEventListener("scroll", checkScroll);
    // Also check when messages change
    const observer = new MutationObserver(() => {
      checkScroll();
      // Auto-scroll to bottom when new messages arrive (if near bottom)
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTo({ top: scrollHeight, behavior: "smooth" });
        }, 100);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      container.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [messages]);

  // Auto-scroll to bottom when processing starts
  useEffect(() => {
    if (isProcessing && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [isProcessing]);

  return (
    <>
      {isMaximized && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMaximized(false)}
          aria-hidden="true"
        />
      )}
      <section
        className={cn(
          "flex flex-col gap-4 transition-all",
          isMaximized
            ? "fixed inset-4 z-50 flex h-[calc(100vh-2rem)] rounded-3xl border border-white/20 bg-black/80 backdrop-blur-xl shadow-2xl p-6"
            : "",
        )}
      >
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-5 py-4 shadow-lg shadow-black/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label={isMaximized ? "Minimize chat" : "Maximize chat"}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Vibe session</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Tell AppBlueprints what you want</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80">
          <Sparkles className={cn("h-4 w-4", isProcessing ? "animate-pulse text-accent" : "text-accent")} />
          {isProcessing ? "Groq synthesizing" : "Groq ready"}
        </div>
      </header>
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/5 bg-black/40 shadow-inner shadow-black/40 transition-all",
          isMaximized
            ? "flex-1 min-h-0"
            : messages.length === 0
              ? "max-h-[300px]"
              : "max-h-[400px]",
        )}
      >
        {/* Scroll indicators */}
        {showScrollTop && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-gradient-to-b from-black/60 to-transparent py-2 pointer-events-none">
            <ChevronUp className="h-4 w-4 text-white/60" />
          </div>
        )}
        {showScrollBottom && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent py-2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-white/60" />
          </div>
        )}

        <div ref={scrollContainerRef} className="flex h-full flex-col gap-4 overflow-y-auto p-6 pr-2">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  source={message.source}
                  images={message.images}
                />
              ))}
              {isProcessing && <ThinkingIndicator />}
            </>
          )}
        </div>
      </div>
      <ChatComposer />
    </section>
    </>
  );
};

type MessageBubbleProps = {
  role: "user" | "assistant" | "system";
  content: string;
  source?: "text" | "voice" | "system";
  images?: MessageImage[];
};

const MessageBubble = ({ role, content, source, images }: MessageBubbleProps) => {
  const isUser = role === "user";
  return (
    <div
      className={cn("flex w-full", {
        "justify-end": isUser,
        "justify-start": !isUser,
      })}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-3xl border px-5 py-3 text-sm leading-6 shadow-lg",
          isUser
            ? "border-accent/30 bg-accent/20 text-white"
            : "border-white/5 bg-white/10 text-white/90",
        )}
      >
        {images && images.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img.url}
                alt={img.name || `Image ${idx + 1}`}
                className="max-h-48 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        {content && <p className="whitespace-pre-wrap">{content}</p>}
        {source === "voice" && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
            <MicWave />
            Voice note
          </span>
        )}
      </div>
    </div>
  );
};

const MicWave = () => (
  <svg viewBox="0 0 36 12" className="h-3 w-6 fill-accent">
    <rect x="0" y="3" width="4" height="6" rx="1.5" />
    <rect x="6" y="1" width="4" height="10" rx="1.5" />
    <rect x="12" y="0" width="4" height="12" rx="1.5" />
    <rect x="18" y="1" width="4" height="10" rx="1.5" />
    <rect x="24" y="3" width="4" height="6" rx="1.5" />
    <rect x="30" y="4" width="4" height="4" rx="1.5" />
  </svg>
);

const ThinkingIndicator = () => (
  <div className="flex w-full justify-start">
    <div className="max-w-[75%] rounded-3xl border border-white/5 bg-white/10 px-5 py-3 text-sm leading-6 shadow-lg">
      <div className="flex items-center gap-2 text-white/60">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
        </div>
        <span className="text-xs">AppBlueprints is thinking...</span>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center text-white/70">
    <Sparkles className="h-6 w-6 text-accent" />
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
        Start the session
      </p>
      <p className="mt-1.5 max-w-sm text-xs text-white/60">
        Share your idea in text or voice, and upload images directly in the chat.
      </p>
    </div>
  </div>
);