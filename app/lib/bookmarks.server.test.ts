import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import { isBookmarked, listBookmarks, toggleBookmark } from "./bookmarks.server";
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

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson with no Bookmark, and unbookmarks it on the next toggle", () => {
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], NOW)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], LATER)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);
  });

  it("never leaves a Student with two Bookmarks on the same Lesson", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(listBookmarks(db, base.user.id)).toHaveLength(1);
  });

  it("is refused by the database if a second row is forced in", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(() =>
      db
        .insert(schema.bookmarks)
        .values({ userId: base.user.id, lessonId: lessonIds[0] })
        .run()
    ).toThrow();
  });
});

describe("listing Bookmarks for the Saved page", () => {
  it("lists only the Student's own Bookmarks, newest first, with Lesson and Course", () => {
    const other = addStudent("Olive");
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[1], LATER);
    toggleBookmark(db, other.id, lessonIds[0], LATER);

    expect(listBookmarks(db, base.user.id)).toMatchObject([
      {
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { lessonId: lessonIds[0], lessonTitle: "Lesson 1" },
    ]);
  });
});

describe("approving a Refund", () => {
  it("leaves the Student's Bookmarks in place", async () => {
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
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    const raised = await raiseRefundRequest(
      db, purchase.id, base.user.id, "Not for me.", NOW, notifications
    );
    if (!raised.ok) throw new Error(raised.error);
    const approved = await approveRefundRequest(
      db, raised.refundRequestId, admin.id, null, NOW, notifications
    );

    expect(approved.ok).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);
  });
});
