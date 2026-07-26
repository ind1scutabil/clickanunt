"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/carData";
import { TAXONOMY } from "@/lib/taxonomy";

interface CategoryPickerProps {
  selectedCategory: string;
  selectedSubcategory: string;
  onSelect: (category: string, subcategory: string) => void;
  className?: string;
}

export default function CategoryPicker({
  selectedCategory,
  selectedSubcategory,
  onSelect,
  className = "",
}: CategoryPickerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"category" | "subcategory">("category");
  const [expandedCategory, setExpandedCategory] = useState<string>(
    selectedCategory || ""
  );
  const [query, setQuery] = useState("");

  const categories = useMemo(() => TAXONOMY.map((c) => c.label), []);

  const subcategories = useMemo(() => {
    if (!expandedCategory) return [];
    return CATEGORIES[expandedCategory] || [];
  }, [expandedCategory]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, query]);

  const filteredSubcategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subcategories;
    return subcategories.filter((s) => s.toLowerCase().includes(q));
  }, [subcategories, query]);

  const summary = selectedCategory
    ? selectedSubcategory
      ? `${selectedCategory} · ${selectedSubcategory}`
      : selectedCategory
    : "Alege categoria";

  const closeSheet = () => {
    setOpen(false);
    setQuery("");
    setLevel(selectedCategory ? "subcategory" : "category");
    if (selectedCategory) setExpandedCategory(selectedCategory);
    previouslyFocused.current?.focus?.();
  };

  const openSheet = () => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setExpandedCategory(selectedCategory || "");
    setLevel(selectedCategory ? "subcategory" : "category");
    setQuery("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickCategory = (cat: string) => {
    setExpandedCategory(cat);
    setLevel("subcategory");
    setQuery("");
  };

  const pickSubcategory = (sub: string) => {
    onSelect(expandedCategory, sub);
    closeSheet();
  };

  const pickCategoryOnly = () => {
    if (!expandedCategory) return;
    onSelect(expandedCategory, "");
    closeSheet();
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openSheet}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#0F1117] px-4 py-3 text-left text-sm text-white transition hover:border-orange-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 md:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`truncate ${selectedCategory ? "text-white" : "text-zinc-400"}`}>
          {summary}
        </span>
        <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Desktop: two-column (unchanged interaction, one column expanded at a time visually) */}
      <div className={`hidden rounded-2xl border border-white/[0.08] bg-[#0F1117] overflow-hidden md:block`}>
        <div className="flex md:min-h-[360px]">
          <div className="w-[280px] border-r border-white/[0.06] overflow-y-auto max-h-[400px]">
            <div className="p-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setExpandedCategory(cat)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all min-h-11 ${
                    expandedCategory === cat
                      ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                      : selectedCategory === cat
                        ? "bg-white/[0.04] text-white border border-white/[0.08]"
                        : "text-zinc-300 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <span className="truncate font-medium">{cat}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {expandedCategory ? (
              <div className="p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-zinc-300 truncate">{expandedCategory}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(expandedCategory, "");
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors shrink-0 min-h-11 px-2"
                  >
                    Fără subcategorie
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(CATEGORIES[expandedCategory] || []).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => onSelect(expandedCategory, sub)}
                      className={`px-3 py-2.5 min-h-11 rounded-lg text-left text-sm transition-all ${
                        selectedCategory === expandedCategory && selectedSubcategory === sub
                          ? "bg-sky-500/15 text-sky-200 border border-sky-500/25"
                          : "text-zinc-300 hover:bg-white/[0.06] border border-transparent"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-zinc-500">
                Selectează o categorie
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Închide fundal"
            onClick={closeSheet}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,920px)] flex-col rounded-t-2xl border border-white/[0.1] bg-zinc-950 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
            style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
          >
            <div className="sticky top-0 z-10 border-b border-white/[0.08] bg-zinc-950/95 px-4 pb-3 pt-2 backdrop-blur">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" aria-hidden />
              <div className="flex items-center gap-2">
                {level === "subcategory" ? (
                  <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-lg px-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
                    onClick={() => {
                      setLevel("category");
                      setQuery("");
                    }}
                  >
                    Înapoi
                  </button>
                ) : (
                  <span className="min-w-11" aria-hidden />
                )}
                <div className="min-w-0 flex-1 text-center">
                  <h3 id={titleId} className="text-base font-semibold text-white">
                    Alege categoria
                  </h3>
                  {level === "subcategory" && expandedCategory && (
                    <p className="truncate text-xs text-zinc-500">{expandedCategory}</p>
                  )}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="min-h-11 min-w-11 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/[0.06]"
                  onClick={closeSheet}
                >
                  Închide
                </button>
              </div>
              <label className="mt-3 block">
                <span className="sr-only">Caută</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={level === "category" ? "Caută categorie…" : "Caută subcategorie…"}
                  className="min-h-11 w-full rounded-xl border border-white/[0.1] bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500/40"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {level === "category" &&
                filteredCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => pickCategory(cat)}
                    className={`mb-1 flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${
                      selectedCategory === cat
                        ? "bg-orange-500/15 text-orange-100"
                        : "text-zinc-200 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="truncate font-medium">{cat}</span>
                    <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}

              {level === "subcategory" && (
                <>
                  <button
                    type="button"
                    onClick={pickCategoryOnly}
                    className="mb-2 flex min-h-11 w-full items-center rounded-xl border border-dashed border-white/[0.12] px-3 text-left text-sm text-sky-300"
                  >
                    Selectează fără subcategorie
                  </button>
                  {filteredSubcategories.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => pickSubcategory(sub)}
                      className={`mb-1 flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm ${
                        selectedCategory === expandedCategory && selectedSubcategory === sub
                          ? "bg-orange-500/15 text-orange-100"
                          : "text-zinc-200 hover:bg-white/[0.05]"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
