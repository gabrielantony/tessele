"use client";

import { useEffect } from "react";

import { SECTION_ATTRIBUTE, track } from "@/lib/analytics";
import { WHATSAPP_URL_PREFIX } from "@/lib/whatsapp";

/*
 * Records a click on any WhatsApp CTA, and which section it came from.
 *
 * Delegated rather than instrumented at the call sites, and that is the whole
 * point: there are seven of them today (Hero, Como trabalhamos, three plan
 * cards, por demanda, footer) and an eighth added next month is measured
 * without anyone remembering to wire it up. Every one of them is built by
 * whatsappHref(), so WHATSAPP_URL_PREFIX is a reliable shape to match.
 *
 * `track` sends synchronously just before the browser follows the link, so its
 * delivery depends on the page staying alive. That holds because every wa.me
 * link opens in a new tab, a guarantee tests/layout/ctas.spec.mjs:64 keeps;
 * changing a CTA to same-tab navigation would make this event unreliable.
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

      const link = event.target.closest(`a[href^="${WHATSAPP_URL_PREFIX}"]`);
      if (!link) return;

      /*
       * The privacy policy's WhatsApp link lives outside any measured section,
       * so a missing key is a real case rather than a bug -- naming it beats
       * dropping the event, because a click from there is still a click.
       */
      const section =
        link
          .closest(`[${SECTION_ATTRIBUTE}]`)
          ?.getAttribute(SECTION_ATTRIBUTE) ?? "fora-de-secao";

      track("whatsapp-click", { section });
    };

    const onAuxClick = (event: MouseEvent) => {
      // auxclick covers every non-primary button, so right-click lands here too.
      // Only the middle button is an activation; button 2 opens a context menu the
      // visitor may just dismiss.
      if (event.button !== 1) return;
      onClick(event);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onAuxClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onAuxClick, true);
    };
  }, []);

  return null;
}
