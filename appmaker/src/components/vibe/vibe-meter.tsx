"use client";

import { useMemo } from "react";
import { Palette } from "lucide-react";

import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";

export const VibeMeter = () => {
  const vibeScore = useAppStore((state) => state.vibeScore);
  const setVibeScore = useAppStore((state) => state.setVibeScore);

  const vibeLabel = useMemo(() => {
    if (vibeScore < 30) return "Chill sketch";
    if (vibeScore < 60) return "Balanced build";
    if (vibeScore < 85) return "High-energy sprint";
    return "Full neon mode";
  }, [vibeScore]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg shadow-black/40 backdrop-blur">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Vibe Meter</p>
          <h3 className="text-lg font-semibold text-white">{vibeLabel}</h3>
        </div>
        <Palette className="h-5 w-5 text-accent" />
      </header>
      <input
        type="range"
        min={0}
        max={100}
        value={vibeScore}
        onChange={(event) => setVibeScore(Number(event.target.value))}
        className={cn(
          "h-1 w-full appearance-none rounded-full bg-white/10 outline-none transition-all",
          "range-thumb:h-4 range-thumb:w-4 range-thumb:appearance-none range-thumb:rounded-full range-thumb:bg-accent range-thumb:shadow-[0_0_15px_rgba(106,91,255,0.7)]",
        )}
      />
      <div className="mt-3 flex items-center justify-between text-xs text-white/60">
        <span>Calm</span>
        <span>{vibeScore}</span>
        <span>Electric</span>
      </div>
      <p className="mt-3 text-xs text-white/55">
        Controls the tone and energy of AppBlueprints' responses: lower values (0-30) = calm and reflective, 
        mid values (30-60) = balanced and practical, higher values (60-85) = energetic and motivating, 
        maximum (85-100) = bold and high-energy with vivid imagery. This affects how AppBlueprints communicates 
        when asking questions and filling your template.
      </p>
    </section>
  );
};
