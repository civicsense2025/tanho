/**
 * Motion entrance animations — progressive enhancement for blocks with a `motion`
 * layer. Those blocks carry [data-motion-trigger]; their scoped CSS holds the
 * initial hidden state (gated on data-blocks-enhanced + no-reduced-motion). This
 * flips [data-motion-in] to play the transition (load-triggered or on scroll into
 * view), with optional stagger. Under reduced-motion it does NOTHING — the CSS
 * guard already leaves the element in its final (visible) state.
 *
 * Extracted from BlockEnhancements to keep that island under the file-size cap;
 * returns cleanups to run on unmount / navigation.
 */
export function enhanceMotion(root: ParentNode, prefersReducedMotion: boolean): Array<() => void> {
  const cleanups: Array<() => void> = [];
  if (prefersReducedMotion) return cleanups;

  const reveal = (el: HTMLElement) => el.setAttribute("data-motion-in", "");

  // Stagger containers orchestrate their DIRECT motion children: when the container
  // enters view, reveal each child in sequence, overriding the child's own trigger.
  const staggerRoots = Array.from(root.querySelectorAll<HTMLElement>("[data-motion-stagger]"));
  const staggered = new Set<HTMLElement>();
  for (const r of staggerRoots) {
    const kids = Array.from(r.querySelectorAll<HTMLElement>("[data-motion-trigger]")).filter(
      (k) => k.parentElement === r || k.closest("[data-motion-stagger]") === r,
    );
    kids.forEach((k) => staggered.add(k));
  }

  // Load-triggered elements: reveal on the next frame (after first paint), minus
  // any that a stagger container owns.
  const loadEls = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-trigger="load"]')).filter(
    (el) => !staggered.has(el),
  );
  if (loadEls.length) {
    const raf = window.requestAnimationFrame(() => loadEls.forEach(reveal));
    cleanups.push(() => window.cancelAnimationFrame(raf));
  }

  // In-view elements (and stagger containers): reveal when they scroll into view.
  const observed = [
    ...Array.from(root.querySelectorAll<HTMLElement>('[data-motion-trigger="in-view"]')).filter(
      (el) => !staggered.has(el),
    ),
    ...staggerRoots,
  ];
  if (observed.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          obs.unobserve(el);
          const step = Number(el.getAttribute("data-motion-stagger")) || 0;
          if (step > 0) {
            const kids = Array.from(el.querySelectorAll<HTMLElement>("[data-motion-trigger]")).filter(
              (k) => k.parentElement === el || k.closest("[data-motion-stagger]") === el,
            );
            kids.forEach((k, i) => {
              const t = window.setTimeout(() => reveal(k), i * step);
              cleanups.push(() => window.clearTimeout(t));
            });
          } else {
            reveal(el);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observed.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  } else {
    // No IntersectionObserver (very old browser): reveal everything immediately.
    observed.forEach(reveal);
  }

  return cleanups;
}
