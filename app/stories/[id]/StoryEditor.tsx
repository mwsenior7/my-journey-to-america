"use client";

import { useState } from "react";
import StoryTranslator from "@/components/StoryTranslator";
import type { StoryTranslation } from "@/lib/supabase";

type Props = {
  storyId: string;
  initialText: string;
  isAuthor: boolean;
  originalLang: string;
  translations: Pick<StoryTranslation, "language_code" | "story_text">[];
};

export default function StoryEditor({
  storyId,
  initialText,
  isAuthor,
  originalLang,
  translations,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [currentText, setCurrentText] = useState(initialText);
  const [draftText, setDraftText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stories/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, story_text: draftText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      setCurrentText(draftText);
      setEditMode(false);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftText(currentText);
    setEditMode(false);
    setError(null);
  };

  if (editMode) {
    return (
      <div className="mb-12">
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          className="w-full min-h-[400px] p-4 text-[1.0625rem] leading-[1.9] text-navy/80 border border-navy/20 rounded-xl resize-y focus:outline-none focus:border-gold/60 bg-white"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-navy text-cream rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-5 py-2.5 border border-navy/20 text-navy/60 rounded-lg text-sm font-semibold hover:border-navy/40 hover:text-navy transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <StoryTranslator
        originalText={currentText}
        originalLang={originalLang}
        translations={translations}
      />
      {isAuthor && (
        <button
          onClick={() => {
            setDraftText(currentText);
            setEditMode(true);
          }}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy/50 hover:text-navy transition-colors border border-navy/20 px-4 py-2.5 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit My Story
        </button>
      )}
    </div>
  );
}
