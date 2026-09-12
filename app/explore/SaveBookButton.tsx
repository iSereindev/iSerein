"use client";

import { useEffect, useState } from "react";

type SaveBookButtonProps = {
  bookId: string;
};

const STORAGE_KEY = "iserein-saved-books";
const CHANGE_EVENT = "iserein-saved-books-changed";

function getSavedBooks(): string[] {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid saved books");
  }

  return [
    ...new Set(
      parsed.filter(
        (id): id is string =>
          typeof id === "string" && id.trim().length > 0
      )
    ),
  ];
}

export default function SaveBookButton({
  bookId,
}: SaveBookButtonProps) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function syncSavedState() {
      try {
        setSaved(getSavedBooks().includes(bookId));
        setError(null);
      } catch {
        setError("Saved books couldn’t be read in this browser.");
      } finally {
        setReady(true);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        syncSavedState();
      }
    }

    syncSavedState();

    window.addEventListener(CHANGE_EVENT, syncSavedState);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(CHANGE_EVENT, syncSavedState);
      window.removeEventListener("storage", handleStorage);
    };
  }, [bookId]);

  function toggleSave() {
    try {
      const savedBooks = getSavedBooks();
      const alreadySaved = savedBooks.includes(bookId);

      const updatedBooks = alreadySaved
        ? savedBooks.filter((id) => id !== bookId)
        : [...savedBooks, bookId];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedBooks)
      );

      setSaved(!alreadySaved);
      setError(null);

      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setError(
        "This change couldn’t be saved. Please check that browser storage is available."
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleSave}
        disabled={!ready}
        aria-pressed={saved}
        aria-label={
          saved
            ? "Remove this book from saved books"
            : "Save this book"
        }
        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#44313D]/20 px-5 py-3 text-sm font-medium text-[#44313D] transition-colors hover:bg-[#E8EEF4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7F6A39] disabled:cursor-wait disabled:opacity-50"
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        {saved ? "Saved book" : "Save book"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm leading-6 text-[#6B2636]">
          {error}
        </p>
      )}
    </div>
  );
}