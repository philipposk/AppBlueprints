"use client";

import { useCallback, useRef } from "react";

import { useAppStore } from "@/state/app-store";
import type { MessageImage } from "@/lib/types";

export const useChatController = () => {
  const addMessage = useAppStore((state) => state.addMessage);
  const setProcessing = useAppStore((state) => state.setProcessing);
  const appendMessages = useAppStore((state) => state.appendMessages);
  const replaceTemplate = useAppStore((state) => state.replaceTemplate);
  const setClarifications = useAppStore((state) => state.setClarifications);
  const vibeScore = useAppStore((state) => state.vibeScore);
  const paletteSummary = useAppStore((state) => state.paletteSummary);
  const template = useAppStore((state) => state.template);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const requestInFlightRef = useRef(false);

  const sendUserMessage = useCallback(
    async (content: string, source: "text" | "voice" = "text", images?: MessageImage[]) => {
      if ((!content.trim() && (!images || images.length === 0)) || requestInFlightRef.current) return;

      const trimmed = content.trim();
      requestInFlightRef.current = true;

      const existingMessages = useAppStore.getState().messages;

      addMessage({
        role: "user",
        content: trimmed,
        source,
        images,
      });

      setProcessing(true);

      try {
        const lastUserMessage = { role: "user" as const, content: trimmed, images };
        const messagesPayload = [...existingMessages, lastUserMessage].filter(
          (message) => message.role === "user" || message.role === "assistant",
        );

        const response = await fetch("/api/groq/plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messagesPayload.map(({ role, content, images: msgImages }) => ({
              role,
              content,
              images: msgImages,
            })),
            template,
            vibeScore,
            paletteSummary,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errorMessage = errorBody?.details || errorBody?.error || "Groq request failed.";
          
          // Provide more helpful error messages
          if (response.status === 413 || errorMessage.toLowerCase().includes("request too large")) {
            throw new Error(
              "Your request is too large. Try shortening your message or clear some template fields to reduce context size."
            );
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Only add assistant message if we got a valid response
        const assistantMessage = data.assistantMessage || data.assistant_message;
        
        // Log the response for debugging
        console.log("Groq response received:", {
          hasTemplate: !!data.template,
          hasClarifications: Array.isArray(data.clarifications),
          clarificationsCount: Array.isArray(data.clarifications) ? data.clarifications.length : 0,
          assistantMessage: assistantMessage?.substring(0, 100),
        });
        
        if (data.template) {
          // Verify template structure before updating
          const templateKeys = Object.keys(data.template);
          console.log("Updating template with documents:", templateKeys);
          
          // Count filled fields before update
          const currentTemplate = useAppStore.getState().template;
          let filledBefore = 0;
          Object.values(currentTemplate).forEach((sections) => {
            sections.forEach((section) => {
              section.fields.forEach((field) => {
                if (field.value.trim()) filledBefore++;
              });
            });
          });
          
          replaceTemplate(data.template);
          
          // Count filled fields after update
          const newTemplate = useAppStore.getState().template;
          let filledAfter = 0;
          Object.values(newTemplate).forEach((sections) => {
            sections.forEach((section) => {
              section.fields.forEach((field) => {
                if (field.value.trim()) filledAfter++;
              });
            });
          });
          
          console.log(`Template updated: ${filledBefore} → ${filledAfter} filled fields`);
        } else {
          console.warn("No template in response:", data);
        }
        
        if (Array.isArray(data.clarifications)) {
          setClarifications(data.clarifications);
          console.log("Clarifications updated:", data.clarifications.length);
        }

        // Only append message if we have content and it's not a duplicate
        if (assistantMessage) {
          const currentMessages = useAppStore.getState().messages;
          const lastMessage = currentMessages[currentMessages.length - 1];
          // Avoid duplicate messages
          if (lastMessage?.role !== "assistant" || lastMessage?.content !== assistantMessage) {
            appendMessages([
              {
                role: "assistant",
                content: assistantMessage,
              },
            ]);
          } else {
            console.warn("Skipping duplicate assistant message");
          }
        } else {
          console.warn("No assistant message in response");
        }
      } catch (error) {
        console.error("sendUserMessage error", error);
        appendMessages([
          {
            role: "system",
            content:
              error instanceof Error
                ? `I couldn't reach Groq: ${error.message}. Double-check your GROQ_API_KEY and try again.`
                : "Something went wrong talking to Groq. Please try again.",
          },
        ]);
      } finally {
        setProcessing(false);
        requestInFlightRef.current = false;
      }
    },
    [
      addMessage,
      appendMessages,
      setProcessing,
      template,
      vibeScore,
      paletteSummary,
      replaceTemplate,
      setClarifications,
    ],
  );

  return {
    sendUserMessage,
    isProcessing,
  };
};
