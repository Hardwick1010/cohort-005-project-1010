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
  // The note is stored trimmed, so whitespace at either end neither counts
  // towards the limit nor makes a change.
  const trimmed = draft.trim();
  const status = statusOf(trimmed, savedBody, maxLength);
  return {
    status,
    canSave: status === "unsaved",
    characterCount: `${trimmed.length.toLocaleString("en")} / ${maxLength.toLocaleString("en")}`,
  };
}

function statusOf(
  trimmed: string,
  savedBody: string | null,
  maxLength: number
): NoteDraftStatus {
  if (trimmed.length > maxLength) return "too-long";
  if (trimmed.length === 0) return "empty";
  return trimmed === savedBody ? "saved" : "unsaved";
}
