import type { ChangeEvent, KeyboardEvent } from "react";

/** Strips everything but digits — for "number as text" fields (national ID, phone) that
 * can't be a native `type="number"` input because they need to keep a leading zero. */
export function stripNonDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/** onChange handler for a digits-only text field: sanitizes typed/pasted/dropped input in place. */
export function digitsOnlyChange(e: ChangeEvent<HTMLInputElement>): void {
  const cleaned = stripNonDigits(e.target.value);
  if (cleaned !== e.target.value) e.target.value = cleaned;
}

/** A native `type="number"` input still accepts "e"/"E" (scientific notation) and "+"/"-",
 * which this app never needs — block them so no letters can be typed into a number field. */
export function blockNumberLetterKeys(e: KeyboardEvent<HTMLInputElement>): void {
  if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
    e.preventDefault();
  }
}
