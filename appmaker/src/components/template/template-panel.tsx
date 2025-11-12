"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ClipboardList, BookOpenCheck, Kanban, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

import { useAppStore } from "@/state/app-store";
import type { TemplateDocument, TemplateField } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "instructions", label: "Instructions", icon: BookOpenCheck },
  { id: "cursorRules", label: "Cursor Rules", icon: ClipboardList },
  { id: "todo", label: "TODO Checklist", icon: Kanban },
] as const;

export const TemplatePanel = () => {
  const template = useAppStore((state) => state.template);
  const clarifications = useAppStore((state) => state.clarifications);
  const updateTemplateField = useAppStore((state) => state.updateTemplateField);
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("instructions");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasAutoCollapsedRef = useRef(false);

  // Check if all fields are filled
  const allFieldsFilled = useMemo(() => {
    let totalFields = 0;
    let filledFields = 0;
    Object.values(template).forEach((sections) => {
      sections.forEach((section) => {
        section.fields.forEach((field) => {
          totalFields++;
          if (field.value.trim()) {
            filledFields++;
          }
        });
      });
    });
    return totalFields > 0 && filledFields === totalFields && clarifications.length === 0;
  }, [template, clarifications]);

  // Auto-collapse once when all fields are filled (only once)
  useEffect(() => {
    if (allFieldsFilled && !hasAutoCollapsedRef.current) {
      setIsCollapsed(true);
      hasAutoCollapsedRef.current = true;
    } else if (!allFieldsFilled) {
      // Reset the flag if fields become unfilled
      hasAutoCollapsedRef.current = false;
    }
  }, [allFieldsFilled]);

  const activeDocument: TemplateDocument = template[activeTab];
  
  // Flatten all fields from all sections into a single array with section context
  const allFields = activeDocument.flatMap((section) =>
    section.fields.map((field) => ({
      ...field,
      sectionTitle: section.title,
      sectionId: section.id,
    }))
  );

  const currentField = allFields[currentCardIndex];
  const hasPrevious = currentCardIndex > 0;
  const hasNext = currentCardIndex < allFields.length - 1;

  const handleFieldChange = (
    document: keyof typeof template,
    sectionId: string,
    fieldId: string,
    value: string
  ) => {
    updateTemplateField(document, sectionId, fieldId, value);
  };

  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setCurrentCardIndex(0);
  };

  return (
    <section className="flex h-full flex-col gap-5">
      <header className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 shadow-lg shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Template Output</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Instructions · Rules · TODOs</h2>
          </div>
          {allFieldsFilled && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label={isCollapsed ? "Expand template" : "Collapse template"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {isCollapsed ? "Expand" : "Collapse"}
            </button>
          )}
        </div>
      </header>
      {!isCollapsed && (
        <>
          <div className="flex items-center gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] transition",
                    isActive
                      ? "border-accent/60 bg-accent/20 text-accent shadow-accent/40"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/90",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-hidden rounded-3xl border border-white/5 bg-black/40 shadow-inner shadow-black/50">
        {allFields.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/60">
            <p>No fields available</p>
          </div>
        ) : (
          <div className="relative flex h-full flex-col">
            {/* Card Navigation */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <button
                onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                disabled={!hasPrevious}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition",
                  hasPrevious
                    ? "border-white/20 bg-white/5 text-white hover:border-accent/60 hover:bg-accent/10"
                    : "border-white/5 bg-white/5 text-white/30 cursor-not-allowed",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span className="font-medium text-white/80">
                  {currentCardIndex + 1}
                </span>
                <span className="text-white/40">/</span>
                <span>{allFields.length}</span>
              </div>
              <button
                onClick={() => setCurrentCardIndex(Math.min(allFields.length - 1, currentCardIndex + 1))}
                disabled={!hasNext}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition",
                  hasNext
                    ? "border-white/20 bg-white/5 text-white hover:border-accent/60 hover:bg-accent/10"
                    : "border-white/5 bg-white/5 text-white/30 cursor-not-allowed",
                )}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Card Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <FieldCard
                field={currentField}
                sectionTitle={currentField.sectionTitle}
                document={activeTab}
                sectionId={currentField.sectionId}
                onChange={handleFieldChange}
              />
            </div>
          </div>
        )}
      </div>
        </>
      )}
      {isCollapsed && allFieldsFilled && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-100">All fields completed!</p>
              <p className="mt-1 text-xs text-emerald-200/80">
                Template is ready for export. Click "Expand" above to review or edit fields.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

type FieldCardProps = {
  field: TemplateField & { sectionTitle: string; sectionId: string };
  sectionTitle: string;
  document: keyof { instructions: unknown; cursorRules: unknown; todo: unknown };
  sectionId: string;
  onChange: (
    document: keyof { instructions: unknown; cursorRules: unknown; todo: unknown },
    sectionId: string,
    fieldId: string,
    value: string
  ) => void;
};

const FieldCard = ({ field, sectionTitle, document, sectionId, onChange }: FieldCardProps) => {
  const isFilled = field.value.trim().length > 0;
  const [showAllExamples, setShowAllExamples] = useState(false);

  const visibleExamples = showAllExamples ? field.examples : field.examples.slice(0, 2);
  const hasMoreExamples = field.examples.length > 2;
  // Recommendations only show when examples are expanded (or if there are 2 or fewer examples)
  const showRecommendations = showAllExamples || field.examples.length <= 2;

  return (
    <div className="mx-auto max-w-2xl">
      <article className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
        <header className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
              {sectionTitle}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]",
                isFilled
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/10 text-white/60",
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              {isFilled ? "Filled" : "Pending"}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white">{field.prompt}</h3>
        </header>

        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-white/5 bg-black/30 p-4 text-xs leading-relaxed text-white/70">
          <div>
            <p className="mb-2 font-medium text-white/50">Examples:</p>
            <ul className="flex flex-col gap-2">
              {visibleExamples.map((example, idx) => (
                <li key={idx} className="text-white/60">
                  <span className="font-medium text-white/70">{idx + 1}.</span> {example}
                </li>
              ))}
            </ul>
            {hasMoreExamples && !showAllExamples && (
              <button
                type="button"
                onClick={() => setShowAllExamples(!showAllExamples)}
                className="mt-2 text-xs text-accent hover:text-accent/80 transition"
              >
                Show {field.examples.length - 2} more
              </button>
            )}
          </div>
          {showRecommendations && (
            <div>
              <p className="mb-2 font-medium text-white/50">Recommendations:</p>
              <ul className="flex flex-col gap-2">
                {field.recommendations.map((recommendation, idx) => (
                  <li key={idx} className="text-white/60">
                    <span className="font-medium text-white/70">{idx + 1}.</span> {recommendation}
                  </li>
                ))}
              </ul>
              {hasMoreExamples && showAllExamples && (
                <button
                  type="button"
                  onClick={() => setShowAllExamples(false)}
                  className="mt-2 text-xs text-accent hover:text-accent/80 transition"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`field-${field.id}`}
            className="block text-xs font-medium uppercase tracking-[0.2em] text-white/60"
          >
            Your Answer
          </label>
          <textarea
            id={`field-${field.id}`}
            value={field.value}
            onChange={(e) => onChange(document, sectionId, field.id, e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[200px] w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white placeholder:text-white/30 focus:border-accent focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {!isFilled && (
            <p className="text-xs text-white/40">
              This field is awaiting your input or AppBlueprints fill-in.
            </p>
          )}
        </div>
      </article>
    </div>
  );
};
