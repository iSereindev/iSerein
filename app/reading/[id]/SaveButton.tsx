"use client";

import { useEffect, useState } from "react";

type SaveButtonProps = {
  articleId: number;
};

const STORAGE_KEY = "iserein-saved";
const CHANGE_EVENT = "iserein-saved-changed";

function getSavedArticles(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(Number)
      .filter((id) => Number.isInteger(id));
  } catch {
    return [];
  }
}

function setSavedArticles(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export default function SaveButton({
  articleId,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function syncSavedState() {
      const savedArticles = getSavedArticles();

      setSaved(savedArticles.includes(articleId));
    }

    syncSavedState();

    window.addEventListener(
      CHANGE_EVENT,
      syncSavedState
    );

    window.addEventListener(
      "storage",
      syncSavedState
    );

    return () => {
      window.removeEventListener(
        CHANGE_EVENT,
        syncSavedState
      );

      window.removeEventListener(
        "storage",
        syncSavedState
      );
    };
  }, [articleId]);

  function toggleSave() {
    const savedArticles = getSavedArticles();

    if (savedArticles.includes(articleId)) {
      const updatedArticles = savedArticles.filter(
        (id) => id !== articleId
      );

      setSavedArticles(updatedArticles);
      setSaved(false);
    } else {
      const updatedArticles = [
        ...savedArticles,
        articleId,
      ];

      setSavedArticles(updatedArticles);
      setSaved(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleSave}
      aria-pressed={saved}
      aria-label={
        saved
          ? "Remove from saved readings"
          : "Save this reading"
      }
      className="rounded-full border border-[#cbdde1] px-5 py-3 text-sm text-[#58727a] transition hover:bg-white"
    >
      {saved ? "♥ Saved" : "♡ Save"}
    </button>
  );
}