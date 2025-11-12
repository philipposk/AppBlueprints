"use client";

import { useMemo } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { TemplatePanel } from "@/components/template/template-panel";
import { ClarificationPanel } from "@/components/clarifications/clarification-panel";
import { CursorExportPanel } from "@/components/cursor/cursor-export";
import { useAppStore } from "@/state/app-store";

export default function Home() {
  const template = useAppStore((state) => state.template);
  
  const appName = useMemo(() => {
    const coreIdeaSection = template.instructions.find((section) => section.id === "core-idea");
    const field = coreIdeaSection?.fields.find((entry) => entry.id === "core-name");
    return field?.value.trim() || null;
  }, [template]);

  return (
    <main className="relative min-h-dvh overflow-hidden pb-16">
      <BackgroundGlow />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pt-16 md:px-8 lg:px-12">
        <Hero appName={appName} />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex flex-col gap-6">
            <ChatPanel />
            <ClarificationPanel />
          </div>
          <div className="flex h-full flex-col gap-6">
            <TemplatePanel />
            <CursorExportPanel />
          </div>
        </div>
      </div>
    </main>
  );
}

type HeroProps = {
  appName: string | null;
};

const Hero = ({ appName }: HeroProps) => (
  <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-6 py-4 shadow-lg shadow-black/40 backdrop-blur">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          AppBlueprints
        </h1>
        {appName && (
          <>
            <span className="text-white/40">·</span>
            <h2 className="text-xl font-medium text-white/90 sm:text-2xl">
              {appName}
            </h2>
          </>
        )}
      </div>
      {appName && (
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          Project active
        </div>
      )}
    </div>
  </section>
);

const BackgroundGlow = () => (
  <div aria-hidden className="pointer-events-none">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute left-[-20%] top-[10%] h-[40rem] w-[40rem] rounded-full bg-accent/30 blur-3xl" />
      <div className="absolute right-[-10%] top-[-10%] h-[35rem] w-[35rem] rounded-full bg-[#ff5fc1]/20 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[30%] h-[28rem] w-[28rem] rounded-full bg-[#30d8ff]/20 blur-3xl" />
    </div>
  </div>
);
