export type Role = "user" | "assistant" | "system";

export type MessageImage = {
  url: string;
  type: string;
  name?: string;
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  source?: "text" | "voice" | "system";
  images?: MessageImage[];
};

export type TemplateField = {
  id: string;
  prompt: string;
  examples: string[];
  recommendations: string[];
  value: string;
};

export type TemplateSection = {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
};

export type TemplateDocument = TemplateSection[];

export type TemplateSet = {
  instructions: TemplateDocument;
  cursorRules: TemplateDocument;
  todo: TemplateDocument;
};

export type ClarificationItem = {
  id: string;
  fieldId: string;
  sectionId: string;
  document: "instructions" | "cursorRules" | "todo";
  question: string;
  examples: string[];
  recommendations: string[];
};

export type MoodBoardAsset = {
  id: string;
  url: string;
  averageColor: string;
  name: string;
};

export type PaletteSummary = {
  dominant: string;
  accents: string[];
  descriptiveTone: string;
};
