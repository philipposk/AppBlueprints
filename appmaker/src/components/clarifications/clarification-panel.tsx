"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/state/app-store";
import { ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ClarificationPanel = () => {
  const clarifications = useAppStore((state) => state.clarifications);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to first item if clarifications change or current index is out of bounds
  useEffect(() => {
    if (clarifications.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= clarifications.length) {
      setCurrentIndex(0);
    }
  }, [clarifications.length, currentIndex]);

  const currentClarification = clarifications[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < clarifications.length - 1;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg shadow-black/40 backdrop-blur">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Clarifications</p>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              {clarifications.length}
            </span>
            <ClipboardCheck className="h-5 w-5 text-accent" />
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Questions AppBlueprints still needs you to answer
          </h2>
        </div>
      </header>
      {clarifications.length === 0 ? (
        <p className="text-sm text-white/50">
          Once Groq fills the template, any missing answers will appear here with examples and
          recommendations ready to go.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
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
                {currentIndex + 1}
              </span>
              <span className="text-white/40">/</span>
              <span>{clarifications.length}</span>
            </div>
            <button
              onClick={() => setCurrentIndex(Math.min(clarifications.length - 1, currentIndex + 1))}
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

          {/* Current Clarification Card */}
          {currentClarification && (
            <article className="rounded-xl border border-white/5 bg-white/5 p-6 text-sm text-white/80">
              <header className="mb-4">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {currentClarification.document} · {currentClarification.sectionId}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-white">{currentClarification.question}</h3>
              </header>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-white/50">Examples:</p>
                  <ul className="space-y-1.5">
                    {currentClarification.examples.map((example, idx) => (
                      <li key={idx} className="text-xs text-white/60">
                        <span className="text-white/70">{idx + 1}.</span> {example}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-white/50">Recommendations:</p>
                  <ul className="space-y-1.5">
                    {currentClarification.recommendations.map((recommendation, idx) => (
                      <li key={idx} className="text-xs text-white/50">
                        <span className="text-white/60">{idx + 1}.</span> {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
};
