import type {
  ClarificationItem,
  TemplateField,
  TemplateSection,
  TemplateSet,
} from "./types";

export type TemplateUpdate = {
  document: keyof TemplateSet;
  sectionId: string;
  fieldId: string;
  value: string;
};

type TemplateFieldRef = {
  document: keyof TemplateSet;
  section: TemplateSection;
  field: TemplateField;
};

export const applyTemplateUpdates = (
  template: TemplateSet,
  updates: TemplateUpdate[],
): TemplateSet => {
  if (updates.length === 0) return template;

  const next = structuredClone(template);

  updates.forEach((update) => {
    const documentSections = next[update.document];
    const section = documentSections.find((entry) => entry.id === update.sectionId);
    if (!section) return;
    const field = section.fields.find((entry) => entry.id === update.fieldId);
    if (!field) return;
    field.value = update.value.trim();
  });

  return next;
};

export const buildClarifications = (template: TemplateSet): ClarificationItem[] => {
  const items: ClarificationItem[] = [];
  Object.entries(template).forEach(([documentKey, sections]) => {
    (sections as TemplateSection[]).forEach((section) =>
      section.fields.forEach((field) => {
        if (!field.value.trim()) {
          items.push({
            id: `${documentKey}-${section.id}-${field.id}`,
            document: documentKey as keyof TemplateSet,
            sectionId: section.title,
            fieldId: field.id,
            question: field.prompt,
            examples: field.examples,
            recommendations: field.recommendations,
          });
        }
      }),
    );
  });
  return items;
};

export const getFieldRef = (
  template: TemplateSet,
  document: keyof TemplateSet,
  sectionId: string,
  fieldId: string,
): TemplateFieldRef | null => {
  const section = template[document].find((entry) => entry.id === sectionId);
  if (!section) return null;
  const field = section.fields.find((entry) => entry.id === fieldId);
  if (!field) return null;
  return { document, section, field };
};

export const serializeTemplateForPrompt = (template: TemplateSet) => {
  const lines: string[] = [];

  Object.entries(template).forEach(([documentKey, sections]) => {
    lines.push(`# ${documentKey}`);
    (sections as TemplateSection[]).forEach((section) => {
      lines.push(`## ${section.title} (section_id: "${section.id}")`);
      section.fields.forEach((field) => {
        // Only include prompt and current value - examples/recommendations are for UI only
        // This significantly reduces token usage while preserving all necessary information
        // Make it clear which fields need filling
        const isEmpty = !field.value.trim();
        const value = field.value.trim() || "[EMPTY - FILL THIS]";
        const status = isEmpty ? "⚠️" : "✓";
        lines.push(`${status} [${field.id}] ${field.prompt}`);
        if (!isEmpty) {
          lines.push(`   Current: ${value}`);
        }
      });
    });
  });

  return lines.join("\n");
};

const sectionToMarkdown = (section: TemplateSection) => {
  const lines: string[] = [];
  lines.push(`### ${section.title}`);
  if (section.description) {
    lines.push(section.description, "");
  }
  section.fields.forEach((field) => {
    // Only include the prompt and answer - examples/recommendations are for UI guidance only
    const answer = field.value.trim() || "_Pending clarification_";
    lines.push(`- **${field.prompt}**`);
    lines.push(`  ${answer}\n`);
  });
  return lines.join("\n");
};

export const templateToMarkdown = (template: TemplateSet) => {
  const instructions = template.instructions
    .map((section) => sectionToMarkdown(section))
    .join("\n\n");
  const cursorRules = template.cursorRules
    .map((section) => sectionToMarkdown(section))
    .join("\n\n");
  const todo = template.todo
    .map((section) => sectionToMarkdown(section))
    .join("\n\n");

  return {
    instructions: `## Instructions\n\n${instructions}`.trim(),
    cursorRules: `## Cursor Rules\n\n${cursorRules}`.trim(),
    todo: `## TODO\n\n${todo}`.trim(),
  };
};
