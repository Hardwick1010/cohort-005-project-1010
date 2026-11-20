import { describeDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft, NoteDraftStatus } from "./lib/draft";

/**
 * What the lesson note editor shows for the text in the box: whether it can
 * be saved, and a character count against the limit.
 *
 * `savedBody` is the note as last stored, or null when there is none yet.
 */
export function describeNoteDraft(
  draft: string,
  savedBody: string | null,
  maxLength: number
): NoteDraft {
  return describeDraft(draft, savedBody, maxLength);
}
