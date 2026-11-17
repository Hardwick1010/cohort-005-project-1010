import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { courses, lessons, modules, notes } from "~/db/schema";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

// ─── Notes ───
// A Student's own writing about a Lesson, private to them. One per Student per
// Lesson, enforced by the unique index on (user_id, lesson_id). A Note body is
// plain text and is never passed through the Markdown renderer. See
// GLOSSARY.md.
//
// Nothing outside the owning Student's Lesson page and Saved page may read a
// Note body. Do not add an Instructor or Platform Admin view.
//
// Every function takes the database first, so tests can hand in an in-memory
// one. Access is not checked here: the route calls the content-access check.

export type Db = BetterSQLite3Database<typeof schema>;

type Note = typeof notes.$inferSelect;

export type SaveNoteResult =
  | { ok: true; note: Note | null }
  | { ok: false; error: string };

/** The Student's Note on the Lesson: its body and "last edited" time. */
export function getNote(db: Db, userId: number, lessonId: number) {
  return (
    db
      .select({ body: notes.body, updatedAt: notes.updatedAt })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
      .get() ?? null
  );
}

/**
 * Saves the Student's Note on the Lesson, trimmed. Saving again replaces the
 * body and moves `updatedAt` on; `createdAt` stays put. A body over
 * MAX_NOTE_LENGTH is refused, not truncated. An empty body removes the Note,
 * since that is what clearing the box and pressing Save means.
 */
export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
): SaveNoteResult {
  const trimmed = body.trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `A note can be at most ${MAX_NOTE_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  if (trimmed.length === 0) {
    db.delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
      .run();
    return { ok: true, note: null };
  }

  const stamp = now.toISOString();
  const note = db
    .insert(notes)
    .values({ userId, lessonId, body: trimmed, createdAt: stamp, updatedAt: stamp })
    .onConflictDoUpdate({
      target: [notes.userId, notes.lessonId],
      set: { body: trimmed, updatedAt: stamp },
    })
    .returning()
    .get();
  return { ok: true, note };
}

/** The Student's Notes for the Saved page, most recently edited first. */
export function listNotes(db: Db, userId: number) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(notes)
    .innerJoin(lessons, eq(notes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
}
