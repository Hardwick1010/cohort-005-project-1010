import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";

describe("describeNoteDraft", () => {
  it("is empty and unsaveable when there is no note and no text", () => {
    expect(describeNoteDraft("", null, 2000)).toEqual({
      status: "empty",
      canSave: false,
      characterCount: "0 / 2,000",
    });
  });

  it("is empty when the text is only whitespace", () => {
    const draft = describeNoteDraft("   \n ", null, 2000);
    expect(draft.status).toBe("empty");
    expect(draft.canSave).toBe(false);
  });

  it("is unsaved when a new note has text", () => {
    const draft = describeNoteDraft("Remember strict mode", null, 2000);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("is saved when the text matches the stored note", () => {
    const draft = describeNoteDraft("Remember", "Remember", 2000);
    expect(draft.status).toBe("saved");
    expect(draft.canSave).toBe(false);
  });

  it("is unsaved when the text differs from the stored note", () => {
    const draft = describeNoteDraft("Remember this", "Remember", 2000);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("is empty, not unsaved, when a stored note is cleared", () => {
    const draft = describeNoteDraft("", "Remember", 2000);
    expect(draft.status).toBe("empty");
    expect(draft.canSave).toBe(false);
  });

  it("allows a note exactly at the limit", () => {
    const draft = describeNoteDraft("a".repeat(5), null, 5);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("is saved when the text differs from the stored note only by surrounding whitespace", () => {
    expect(describeNoteDraft("  Remember\n", "Remember", 2000).status).toBe(
      "saved"
    );
  });

  it("is too long one character over the limit", () => {
    const draft = describeNoteDraft("a".repeat(6), null, 5);
    expect(draft.status).toBe("too-long");
    expect(draft.canSave).toBe(false);
    expect(draft.characterCount).toBe("6 / 5");
  });

  it("is too long even when it matches an over-limit stored note", () => {
    expect(describeNoteDraft("abcdef", "abcdef", 5).status).toBe("too-long");
  });

  it("groups thousands in the character count", () => {
    expect(describeNoteDraft("a".repeat(1234), null, 2000).characterCount).toBe(
      "1,234 / 2,000"
    );
  });
});
