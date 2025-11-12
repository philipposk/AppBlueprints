"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { FileOutput, CheckCircle2, AlertTriangle, Loader2, Sparkles, Rocket, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";

import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";

type ExportStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; message: string; files?: Array<{ path: string; contents: string }> }
  | { state: "error"; message: string };

export const CursorExportPanel = () => {
  const template = useAppStore((state) => state.template);
  const clarifications = useAppStore((state) => state.clarifications);
  const reset = useAppStore((state) => state.reset);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ExportStatus>({ state: "idle" });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const hasAutoExpandedRef = useRef(false);

  const inferredName = useMemo(() => {
    const coreIdeaSection = template.instructions.find((section) => section.id === "core-idea");
    const field = coreIdeaSection?.fields.find((entry) => entry.id === "core-name");
    return field?.value.trim() || "AppBlueprints Project";
  }, [template]);

  const pendingClarifications = clarifications.length > 0;
  
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
    return totalFields > 0 && filledFields === totalFields;
  }, [template]);

  const isComplete = allFieldsFilled && !pendingClarifications;

  // Auto-expand when all fields are completed (only once)
  useEffect(() => {
    if (isComplete && !hasAutoExpandedRef.current) {
      setIsCollapsed(false);
      hasAutoExpandedRef.current = true;
    } else if (!isComplete) {
      // Reset the flag if fields become incomplete
      hasAutoExpandedRef.current = false;
    }
  }, [isComplete]);

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/cursor/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template,
          metadata: {
            appName: inferredName,
            note: note.trim() || undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          "Cursor export failed. Check that your credentials are configured.";
        setStatus({ state: "error", message });
        return;
      }

      // Handle preview status (when credentials not configured) as success
      const isPreview = data?.status === "preview";
      const files = data?.payloadPreview?.files || data?.files;
      setStatus({
        state: "success",
        message: data?.message ?? (isPreview 
          ? "Export preview generated. Download the files below."
          : "Export stub queued. Check server logs for payload preview."),
        files: files,
      });
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error instanceof Error ? error.message : "Unexpected error while triggering export.",
      });
    }
  };

  return (
    <section className="flex flex-col rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40 backdrop-blur">
      {!isCollapsed && (
        <div className="flex flex-col gap-3 p-5 pb-3">
      <div className="flex items-start gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 p-3 text-xs text-blue-100">
        <FileOutput className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          <span className="font-semibold">Note:</span> Cursor API needs configuring.
        </p>
      </div>
      
      {isComplete ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <div className="rounded-full bg-emerald-500/20 p-2">
            <Sparkles className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-100">All set! Ready to export</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              All template fields are filled. Export to Cursor to start building.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/60">
            App name inferred as <span className="font-semibold text-white">{inferredName}</span>.
            Update the Core Idea · Name field in Instructions to change this before export.
          </p>
          {pendingClarifications && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                {clarifications.length} clarification
                {clarifications.length === 1 ? "" : "s"} pending. Export anyway or answer them first so
                your Cursor files ship fully populated.
              </p>
            </div>
          )}
        </>
      )}
      <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
        Optional note to include with export
        <textarea
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
          placeholder="E.g. “Kick off neon writer build – align with synthwave palettes.”"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleExport}
          disabled={status.state === "loading"}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70",
            isComplete
              ? "bg-emerald-500 shadow-emerald-500/30 hover:shadow-emerald-500/50"
              : "bg-accent shadow-accent/30 hover:shadow-accent/50",
          )}
        >
          {status.state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting…
            </>
          ) : isComplete ? (
            <>
              <Rocket className="h-4 w-4" />
              Export to Cursor
            </>
          ) : (
            <>
              <FileOutput className="h-4 w-4" />
              Export to Cursor
            </>
          )}
        </button>
        {status.state === "success" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {status.message}
              </span>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setNote("");
                  setStatus({ state: "idle" });
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Start New Project
              </button>
            </div>
            {status.files && status.files.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Generated Files
                </p>
                <div className="flex flex-col gap-2">
                  {status.files.map((file, idx) => {
                    const filename = file.path.split("/").pop() || `file-${idx + 1}.md`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-white/40" />
                          <span className="text-sm text-white/80">{filename}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadFile(filename, file.contents)}
                          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {status.state === "error" && (
          <span className="flex items-center gap-1 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {status.message}
          </span>
        )}
      </div>
        </div>
      )}
      <header className="flex items-center justify-between border-t border-white/5 p-5 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Cursor handoff</p>
          <h3 className="text-lg font-semibold text-white">Push this plan into your workspace</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label={isCollapsed ? "Expand export panel" : "Collapse export panel"}
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <FileOutput className="h-5 w-5 text-accent" />
        </div>
      </header>
    </section>
  );
};
