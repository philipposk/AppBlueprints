"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { FastAverageColor } from "fast-average-color";

import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";

const fac = new FastAverageColor();

export const MoodBoard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const moodBoard = useAppStore((state) => state.moodBoard);
  const setMoodBoard = useAppStore((state) => state.setMoodBoard);
  const paletteSummary = useAppStore((state) => state.paletteSummary);
  const setPaletteSummary = useAppStore((state) => state.setPaletteSummary);

  const removeAsset = useCallback(
    (id: string) => {
      const updated = moodBoard.filter((asset) => asset.id !== id);
      setMoodBoard(updated);
      if (updated.length === 0) {
        setPaletteSummary(null);
      }
    },
    [moodBoard, setMoodBoard, setPaletteSummary],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsLoading(true);

      const newAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file);
          const averageColor = await fac
            .getColorAsync(dataUrl, { algorithm: "dominant" })
            .then((color) => color.hex)
            .catch(() => "#888888");

          return {
            id: crypto.randomUUID(),
            url: dataUrl,
            averageColor,
            name: file.name,
          };
        }),
      );

      const combined = [...moodBoard, ...newAssets].slice(-6); // limit to last 6 uploads
      setMoodBoard(combined);
      setIsLoading(false);

      if (combined.length > 0) {
        const accentColors = combined.map((asset) => asset.averageColor);
        setPaletteSummary({
          dominant: combined[combined.length - 1]?.averageColor ?? "#6a5bff",
          accents: accentColors,
          descriptiveTone: describePalette(accentColors),
        });
      }
    },
    [moodBoard, setMoodBoard, setPaletteSummary],
  );

  const paletteChip = useMemo(() => {
    if (!paletteSummary) return null;
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Palette summary</p>
        <div className="flex items-center gap-2">
          <span
            className="h-8 w-8 rounded-full border border-white/10 shadow-lg shadow-black/40"
            style={{ backgroundColor: paletteSummary.dominant }}
            aria-label="Dominant color chip"
          />
          <div className="flex flex-wrap gap-2">
            {paletteSummary.accents.slice(0, 4).map((color) => (
              <span
                key={`${color}-chip`}
                className="h-6 w-6 rounded-full border border-white/10 shadow-inner"
                style={{ backgroundColor: color }}
                aria-label={`Accent color ${color}`}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-white/60">{paletteSummary.descriptiveTone}</p>
      </div>
    );
  }, [paletteSummary]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg shadow-black/40 backdrop-blur">
      <header className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Mood board</p>
        <h3 className="text-lg font-semibold text-white">
          Add visuals to steer AppBlueprints' clarifying questions
        </h3>
      </header>
      <label
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center transition hover:border-accent/60 hover:bg-white/10",
          isLoading && "pointer-events-none opacity-60",
        )}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        ) : (
          <UploadCloud className="h-6 w-6 text-accent transition group-hover:scale-105" />
        )}
        <p className="mt-3 text-sm font-medium text-white">
          Drop PNG, JPG, or WEBP (max 6)
        </p>
        <p className="mt-1 text-xs text-white/60">
          AppBlueprints samples colors + keywords to tune the vibe meter and prompts.
        </p>
      </label>

      {moodBoard.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {paletteChip}
          <div className="grid grid-cols-3 gap-3">
            {moodBoard.map((asset) => (
              <figure
                key={asset.id}
                className="group relative overflow-hidden rounded-xl border border-white/10"
              >
                <Image
                  src={asset.url}
                  alt={asset.name}
                  width={200}
                  height={200}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-3 py-2 text-xs text-white/80">
                  <span className="truncate">{asset.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    className="rounded-full border border-white/20 bg-black/40 p-1 text-white/60 transition hover:bg-white/20 hover:text-white"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const describePalette = (colors: string[]) => {
  if (colors.length === 0) return "Upload images to craft the vibe.";
  const unique = Array.from(new Set(colors.map((color) => color.toUpperCase())));
  if (unique.length === 1) {
    return `Single-tone focus: ${unique[0]}. AppBlueprints will keep prompts tight and minimal.`;
  }
  if (unique.length === 2) {
    return `Dual-tone palette (${unique.join(" & ")}). Expect balanced clarifications and matching UI notes.`;
  }
  return `Eclectic mix (${unique.slice(0, 3).join(", ")}). AppBlueprints will go bolder with ideas and tone.`;
};
