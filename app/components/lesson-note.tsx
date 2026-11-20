import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { cn, formatRelativeTime } from "~/lib/utils";
import {
  describeNoteDraft,
  type NoteDraft,
  type NoteDraftStatus,
} from "~/modules/lesson-notes";

export type SavedNote = { body: string; updatedAt: string };

/**
 * The Student's private note on a lesson. Laid out like the Questions &
 * Discussion card further down the page, so the two read as one family.
 */
export function LessonNote({ note }: { note: SavedNote | null }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const draft = describeNoteDraft(body, note?.body ?? null, MAX_NOTE_LENGTH);

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <NoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={4}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              // The error was about the text that was submitted; once the
              // text changes it no longer applies.
              if (error) fetcher.reset();
            }}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            aria-invalid={draft.status === "too-long"}
          />

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !draft.canSave}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>
            <NoteStatus
              status={draft.status}
              error={error}
              updatedAt={note?.updatedAt}
            />
            <NoteCharacterCount draft={draft} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteCharacterCount({ draft }: { draft: NoteDraft }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs tabular-nums text-muted-foreground",
        draft.status === "too-long" && "text-destructive"
      )}
    >
      {draft.characterCount}
    </span>
  );
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">Your notes</h2>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only you can see these
      </span>
    </div>
  );
}

function NoteStatus({
  status,
  error,
  updatedAt,
}: {
  status: NoteDraftStatus;
  error: string | undefined;
  updatedAt: string | undefined;
}) {
  if (error) return <span className="text-sm text-destructive">{error}</span>;
  if (status === "too-long") {
    return (
      <span className="text-xs text-destructive">
        Too long to save. Trim it down first.
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (status === "saved" && updatedAt) {
    return (
      <span suppressHydrationWarning className="text-xs text-muted-foreground">
        Saved {formatRelativeTime(updatedAt)}
      </span>
    );
  }
  return null;
}
