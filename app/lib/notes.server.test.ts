import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import { getNote, listNotes, saveNote } from "./notes.server";
import { MAX_NOTE_LENGTH } from "./notes";
import { approveRefundRequest, raiseRefundRequest } from "./refunds.server";
import { fakeNotifications } from "./notifications.fake.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);
const LATER = new Date(2026, 9, 7, 12, 0, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: UserRole.Student,
    })
    .returning()
    .get();
}

describe("saving a Note", () => {
  it("creates a Note on a Lesson with none, with the body trimmed", () => {
    expect(getNote(db, base.user.id, lessonIds[0])).toBeNull();

    const result = saveNote(db, base.user.id, lessonIds[0], "  # not a heading *  ", NOW);

    expect(result.ok).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "# not a heading *",
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last-edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First thought", NOW);
    const result = saveNote(db, base.user.id, lessonIds[0], "Second thought", LATER);

    expect(result).toMatchObject({
      ok: true,
      note: {
        body: "Second thought",
        createdAt: NOW.toISOString(),
        updatedAt: LATER.toISOString(),
      },
    });
    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("refuses a Note over 2,000 characters and keeps the old one", () => {
    saveNote(db, base.user.id, lessonIds[0], "Keep me", NOW);

    const result = saveNote(
      db, base.user.id, lessonIds[0], "a".repeat(MAX_NOTE_LENGTH + 1), LATER
    );

    expect(result).toEqual({
      ok: false,
      error: "A note can be at most 2,000 characters.",
    });
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe("Keep me");
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH);

    expect(saveNote(db, base.user.id, lessonIds[0], body, NOW).ok).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe(body);
  });

  it("removes the Note when saved empty", () => {
    saveNote(db, base.user.id, lessonIds[0], "Draft", NOW);

    expect(saveNote(db, base.user.id, lessonIds[0], "   ", LATER)).toEqual({
      ok: true,
      note: null,
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeNull();
  });

  it("is refused by the database if a second row is forced in", () => {
    saveNote(db, base.user.id, lessonIds[0], "Only one", NOW);

    expect(() =>
      db
        .insert(schema.notes)
        .values({ userId: base.user.id, lessonId: lessonIds[0], body: "Two" })
        .run()
    ).toThrow();
  });
});

describe("listing Notes for the Saved page", () => {
  it("lists only the Student's own Notes, last edited first, with Lesson and Course", () => {
    const other = addStudent("Olive");
    saveNote(db, base.user.id, lessonIds[1], "Older", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Newer", LATER);
    saveNote(db, other.id, lessonIds[0], "Someone else's", LATER);

    expect(listNotes(db, base.user.id)).toMatchObject([
      {
        body: "Newer",
        lessonId: lessonIds[0],
        lessonTitle: "Lesson 1",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { body: "Older", lessonId: lessonIds[1] },
    ]);
  });
});

describe("approving a Refund", () => {
  it("leaves the Student's Notes in place", async () => {
    const notifications = fakeNotifications();
    const admin = db
      .insert(schema.users)
      .values({ name: "Pat Admin", email: "pat@example.com", role: UserRole.Admin })
      .returning()
      .get();
    const purchase = db
      .insert(schema.purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 7900,
        createdAt: NOW.toISOString(),
      })
      .returning()
      .get();
    db.insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    saveNote(db, base.user.id, lessonIds[0], "Mine", NOW);

    const raised = await raiseRefundRequest(
      db, purchase.id, base.user.id, "Not for me.", NOW, notifications
    );
    if (!raised.ok) throw new Error(raised.error);
    const approved = await approveRefundRequest(
      db, raised.refundRequestId, admin.id, null, NOW, notifications
    );

    expect(approved.ok).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe("Mine");
  });
});
