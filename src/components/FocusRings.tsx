"use client";

import { useEffect } from "react";

/*
 * Records whether focus is currently arriving from the keyboard or from a
 * pointer, as `data-focus` on <html>. Renders nothing; globals.css reads the
 * attribute to decide whether a focus ring paints.
 *
 * Why this exists at all, when `:focus-visible` is supposed to be the answer:
 * `:focus-visible` is true for ANY keyboard interaction, not just Tab. The cases
 * rail is a scroll container with tabIndex, so clicking anywhere in that section
 * focuses it silently -- and the next arrow key, pressed to scroll the page,
 * turns `:focus-visible` on and lights the whole rail up. Nothing about that
 * reads as "you focused something"; it reads as the page glitching.
 *
 * So the discriminator is Tab, not "some key". Everything else -- arrows, space,
 * typing -- leaves the pointer state alone.
 */
export default function FocusRings() {
  useEffect(() => {
    const root = document.documentElement;

    const markPointer = () => root.setAttribute("data-focus", "pointer");

    const markKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        root.setAttribute("data-focus", "keyboard");
      }
    };

    /*
     * Capture phase on both. `pointerdown` and the Tab `keydown` each fire
     * before focus actually moves, so the attribute is already correct by the
     * time the browser evaluates `:focus-visible` on the new target. On the
     * bubble phase a handler that calls stopPropagation would hide the event
     * from us and leave the previous modality in place.
     */
    window.addEventListener("pointerdown", markPointer, true);
    window.addEventListener("keydown", markKeyboard, true);

    return () => {
      window.removeEventListener("pointerdown", markPointer, true);
      window.removeEventListener("keydown", markKeyboard, true);
    };
  }, []);

  return null;
}
