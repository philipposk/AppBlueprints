"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Mic, MicOff, Loader2, Image as ImageIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MessageImage } from "@/lib/types";
import { useChatController } from "@/hooks/use-chat-controller";
import { useAppStore } from "@/state/app-store";

type ChatComposerProps = {
  className?: string;
};

export const ChatComposer = ({ className }: ChatComposerProps) => {
  const [draft, setDraft] = useState("");
  const [attachedImages, setAttachedImages] = useState<MessageImage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendUserMessage, isProcessing } = useChatController();
  const messages = useAppStore((state) => state.messages);
  const hasSentMessage = messages.length > 0;

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!draft.trim() && attachedImages.length === 0) || isProcessing || isSubmittingRef.current) return;

    const messageToSend = draft.trim();
    const imagesToSend = [...attachedImages];
    setDraft("");
    setAttachedImages([]);
    isSubmittingRef.current = true;

    try {
      await sendUserMessage(messageToSend || "See attached images", "text", imagesToSend);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        console.warn("Skipping non-image file:", file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachedImages((prev) => [
          ...prev,
          {
            url: dataUrl,
            type: file.type,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceToggle = async () => {
    if (isProcessing || isTranscribing) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        cleanupStream();
        await transcribeBlob(blob);
      });

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Voice capture error", error);
      cleanupStream();
    }
  };

  const cleanupStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const transcribeBlob = async (blob: Blob) => {
    if (blob.size === 0 || isProcessing || isSubmittingRef.current) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, `appblueprints-voice-${Date.now()}.webm`);
      const response = await fetch("/api/groq/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.details || "Transcription failed.");
      }
      const data: { text?: string } = await response.json();
      if (data.text && !isSubmittingRef.current) {
        const textToSend = data.text.trim();
        setDraft("");
        isSubmittingRef.current = true;
        try {
          await sendUserMessage(textToSend, "voice");
        } finally {
          isSubmittingRef.current = false;
        }
      }
    } catch (error) {
      console.error("Transcription error", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg shadow-black/30 backdrop-blur-lg transition",
        "focus-within:border-accent/70 focus-within:bg-white/10",
        className,
      )}
    >
      <label htmlFor="appblueprints-message" className="text-xs uppercase tracking-[0.2em] text-white/60">
        Drop your idea or follow-up
      </label>
      {attachedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/40 p-2">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative">
              <img
                src={img.url}
                alt={img.name || `Image ${idx + 1}`}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -right-1 -top-1 rounded-full bg-rose-500 p-0.5 text-white transition hover:bg-rose-600"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        id="appblueprints-message"
        className="min-h-[120px] resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
        placeholder={hasSentMessage ? "" : "Describe your app idea here..."}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageSelect}
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isTranscribing}
            className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <ImageIcon className="h-4 w-4 text-accent" />
            Add images
          </button>
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={isProcessing || isTranscribing}
            className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            ) : isRecording ? (
              <MicOff className="h-4 w-4 text-rose-400" />
            ) : (
              <Mic className="h-4 w-4 text-accent" />
            )}
            {isTranscribing ? "Transcribing..." : isRecording ? "Stop recording" : "Voice capture"}
          </button>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:shadow-accent/50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isProcessing || isTranscribing}
        >
          {isProcessing ? "Thinking..." : "Send to AppBlueprints"}
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
};
