"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

/*
 * Records a click on any WhatsApp CTA, and which section it came from.
 *
 * Delegated rather than instrumented at the call sites, and that is the whole
 * point: there are seven of them today (Hero, Como trabalhamos, three plan
 * cards, por demanda, footer) and an eighth added next month is measured
 * without anyone remembering to wire it up. Every one of them is built by
 * whatsappHref(), so `https://wa.me/` is a reliable shape to match.
 *
 * This listener must never claim the event. Capture phase so it sees the click
 * before any handler can stopPropagation, but no preventDefault, no
 * stopPropagation, and no dependency on the send completing -- the page already
 * has one global input layer in FocusRings, and a second one that interfered
 * would break the anchors this exists to measure.
 */
export default function WhatsappClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest('a[href^="https://wa.me/"]');
      if (!link) return;

      /*
       * The privacy policy's WhatsApp link lives outside any measured section,
       * so a missing key is a real case rather than a bug -- naming it beats
       * dropping the event, because a click from there is still a click.
       */
      const section =
        link
          .closest("[data-analytics-section]")
          ?.getAttribute("data-analytics-section") ?? "fora-de-secao";

      track("whatsapp-click", { section });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
