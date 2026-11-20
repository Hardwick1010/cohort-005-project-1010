export type NoteDraftStatus = "empty" | "too-long" | "unsaved" | "saved";

export type NoteDraft = {
  status: NoteDraftStatus;
  canSave: boolean;
  characterCount: string;
};

export function describeDraft(
  draft: string,
  savedBody: string | null,
  maxLength: number
): NoteDraft {
  const status = statusOf(draft, savedBody, maxLength);
  return {
    status,
    canSave: status === "unsaved",
    characterCount: `${draft.length.toLocaleString("en")} / ${maxLength.toLocaleString("en")}`,
  };
}

function statusOf(
  draft: string,
  savedBody: string | null,
  maxLength: number
): NoteDraftStatus {
  if (draft.length > maxLength) return "too-long";
  const trimmed = draft.trim();
  if (trimmed.length === 0) return "empty";
  // The note is stored trimmed, so whitespace at either end is not a change.
  return trimmed === savedBody ? "saved" : "unsaved";
}
