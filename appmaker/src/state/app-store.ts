import { create } from "zustand";

import {
  type ClarificationItem,
  type Message,
  type MoodBoardAsset,
  type PaletteSummary,
  type TemplateSet,
} from "@/lib/types";
import { createBlankTemplateSet } from "@/lib/template-data";
import { buildClarifications } from "@/lib/template-helpers";
import { nowIso } from "@/lib/utils";

type AppStore = {
  messages: Message[];
  template: TemplateSet;
  clarifications: ClarificationItem[];
  vibeScore: number;
  paletteSummary: PaletteSummary | null;
  moodBoard: MoodBoardAsset[];
  isProcessing: boolean;
  addMessage: (message: Omit<Message, "id" | "createdAt">) => void;
  appendMessages: (messages: Omit<Message, "id" | "createdAt">[]) => void;
  replaceTemplate: (template: TemplateSet) => void;
  updateTemplateField: (
    document: keyof TemplateSet,
    sectionId: string,
    fieldId: string,
    value: string,
  ) => void;
  setClarifications: (clarifications: ClarificationItem[]) => void;
  setVibeScore: (value: number) => void;
  setPaletteSummary: (summary: PaletteSummary | null) => void;
  setMoodBoard: (assets: MoodBoardAsset[]) => void;
  setProcessing: (value: boolean) => void;
  reset: () => void;
};

const withIds = (message: Omit<Message, "id" | "createdAt">): Message => ({
  ...message,
  id: crypto.randomUUID(),
  createdAt: nowIso(),
});

export const useAppStore = create<AppStore>((set) => ({
  messages: [],
  template: createBlankTemplateSet(),
  clarifications: [],
  vibeScore: 65,
  paletteSummary: null,
  moodBoard: [],
  isProcessing: false,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, withIds(message)],
    })),
  appendMessages: (messages) =>
    set((state) => ({
      messages: [...state.messages, ...messages.map(withIds)],
    })),
  replaceTemplate: (template) =>
    set(() => ({
      template: template ?? createBlankTemplateSet(),
    })),
  updateTemplateField: (document, sectionId, fieldId, value) =>
    set((state) => {
      const nextTemplate = structuredClone(state.template);
      const section = nextTemplate[document].find((s) => s.id === sectionId);
      if (section) {
        const field = section.fields.find((f) => f.id === fieldId);
        if (field) {
          field.value = value;
        }
      }
      const clarifications = buildClarifications(nextTemplate);
      return { template: nextTemplate, clarifications };
    }),
  setClarifications: (clarifications) =>
    set(() => ({
      clarifications,
    })),
  setVibeScore: (value) =>
    set(() => ({
      vibeScore: Math.min(100, Math.max(0, value)),
    })),
  setPaletteSummary: (summary) =>
    set(() => ({
      paletteSummary: summary,
    })),
  setMoodBoard: (assets) =>
    set(() => ({
      moodBoard: assets,
    })),
  setProcessing: (value) =>
    set(() => ({
      isProcessing: value,
    })),
  reset: () =>
    set(() => ({
      messages: [],
      template: createBlankTemplateSet(),
      clarifications: [],
      vibeScore: 65,
      paletteSummary: null,
      moodBoard: [],
      isProcessing: false,
    })),
}));
