"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enhancePolls } from "./poll-enhance";

/**
 * The one progressive-enhancement island for the structural blocks. Mounted
 * once in the public layout; renders nothing. Every feature it powers has a
 * complete no-JS fallback in the block's own server HTML — this only *enhances*:
 *
 *  - TOC scroll-spy: observes `[id]` headings and sets `aria-current="location"`
 *    on the matching `[data-toc-link]` as each section scrolls into view.
 *  - reading-progress: a `requestAnimationFrame` fallback that sets
 *    `--reading-progress` on `[data-reading-progress]` bars for browsers without
 *    CSS `animation-timeline: scroll()` (which handles it JS-free where supported).
 *  - jump-to-top: reveals `[data-jump-top]` once the page is scrolled past a
 *    threshold (its `data-jump-top` value, in px; default 400).
 *
 * Re-initialises on client-side navigation (pathname change) since the DOM the
 * observers watch is replaced.
 */
export function BlockEnhancements() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cleanups: Array<() => void> = [];

    // Mark the document as JS-enhanced so blocks' CSS can switch from their
    // no-JS fallback (e.g. jump-to-top always visible) to the enhanced state
    // (revealed on scroll). Keyed on the root, so no per-element attribute is
    // mutated during hydration.
    const rootEl = document.documentElement;
    rootEl.setAttribute("data-blocks-enhanced", "");
    cleanups.push(() => rootEl.removeAttribute("data-blocks-enhanced"));

    // ---- active nav-menu link --------------------------------------------
    // nav-menu links (server-rendered, in the chrome layout that can't know the
    // current route) carry [data-nav-href]. Mark the one matching the current
    // path with [data-active] so the nav's CSS current-page styles apply. Runs
    // on every navigation (effect re-keys on pathname). No teardown needed:
    // stamping is idempotent and re-evaluated each run.
    const navLinks = document.querySelectorAll<HTMLElement>("[data-nav-href]");
    for (const link of navLinks) {
      const target = link.getAttribute("data-nav-href");
      // Exact path match; also treat "/" specially so it isn't active everywhere.
      const isActive = target === pathname;
      if (isActive) link.setAttribute("data-active", "");
      else link.removeAttribute("data-active");
    }

    // ---- mobile nav drawer niceties (progressive enhancement) ------------
    // The nav-menu mobile menu is a native <details data-mobile-nav>; with JS
    // off it fully works. Here we LAYER the drawer conveniences: Esc to close,
    // scrim tap-to-close, body-scroll-lock while a covering menu is open, and a
    // focus-trap. Nothing gates content — every link is already in the DOM.
    const drawers = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-mobile-nav]"));
    for (const details of drawers) {
      const scrim = details.querySelector<HTMLElement>("[data-mobile-scrim]");
      // Body-scroll-lock: only for menus that cover the page (data-mobile-lock).
      const syncScrollLock = () => {
        const anyOpen = drawers.some((d) => d.hasAttribute("data-mobile-lock") && d.open);
        document.body.style.overflow = anyOpen ? "hidden" : "";
      };
      const close = () => {
        details.open = false;
        // Setting `open` programmatically does NOT fire `toggle`, so release the
        // scroll-lock explicitly (the toggle listener only fires on user clicks).
        syncScrollLock();
      };

      // Esc closes an open drawer (a drawer-standard affordance).
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && details.open) {
          close();
          details.querySelector<HTMLElement>("summary")?.focus();
        }
      };
      // Tab cycles within the open panel (focus-trap).
      const onTrap = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !details.open) return;
        const focusables = details.querySelectorAll<HTMLElement>(
          'a[href], button, summary, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      const onScrimClick = () => close();
      // On user open/close of THIS details, re-evaluate the lock across all
      // drawers (the summary click fires a real toggle event).
      const onToggle = () => syncScrollLock();

      details.addEventListener("keydown", onKeyDown);
      details.addEventListener("keydown", onTrap);
      details.addEventListener("toggle", onToggle);
      scrim?.addEventListener("click", onScrimClick);
      cleanups.push(() => {
        details.removeEventListener("keydown", onKeyDown);
        details.removeEventListener("keydown", onTrap);
        details.removeEventListener("toggle", onToggle);
        scrim?.removeEventListener("click", onScrimClick);
        document.body.style.overflow = "";
      });
    }

    // ---- smooth anchor scrolling (TOC opt-in) ----------------------------
    // A TOC with smoothScroll on emits [data-toc-smooth]; enable smooth scroll
    // on the document rather than forcing it site-wide. Respect reduced-motion.
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (document.querySelector("[data-toc-smooth]") && !prefersReducedMotion) {
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "smooth";
      cleanups.push(() => {
        root.style.scrollBehavior = prev;
      });
    }

    // ---- TOC scroll-spy ---------------------------------------------------
    // Only TOCs with highlightActive on emit [data-toc-spy]; others opt out of
    // scroll-spy entirely (the island never touches their aria-current). The
    // server pre-marks the first in-range link aria-current="location", so the
    // island's first recompute() (also "first heading until you scroll past
    // one") agrees with the SSR HTML — no hydration mismatch.
    const tocLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("[data-toc-spy] [data-toc-link]"),
    );
    if (tocLinks.length > 0) {
      const linkFor = new Map(tocLinks.map((a) => [a.getAttribute("data-toc-link")!, a]));
      const targets = tocLinks
        .map((a) => document.getElementById(a.getAttribute("data-toc-link")!))
        .filter((el): el is HTMLElement => el != null);

      // The active heading is the LAST one whose top has crossed a line ~25%
      // down the viewport (i.e. the deepest section you've scrolled to). This is
      // robust where a rootMargin band isn't: a heading scrolled all the way to
      // the top stays active instead of falling out of an observation band. When
      // no heading has crossed yet (very top of page), the first heading is
      // active so the TOC is never blank.
      const LINE_RATIO = 0.25;
      let currentId: string | null = null;
      const recompute = () => {
        const line = window.innerHeight * LINE_RATIO;
        let activeId: string | null = targets.length ? targets[0]!.id : null;
        for (const el of targets) {
          if (el.getBoundingClientRect().top <= line) activeId = el.id;
          else break; // targets are in document order; stop at the first below the line
        }
        if (activeId === currentId) return;
        currentId = activeId;
        for (const [id, a] of linkFor) {
          if (id === activeId) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        }
      };

      let raf = 0;
      const onScroll = () => {
        if (!raf) raf = window.requestAnimationFrame(() => {
          raf = 0;
          recompute();
        });
      };
      // Defer the first highlight to the next frame rather than calling
      // recompute() synchronously here: this effect runs in React's commit
      // phase right after hydration, and mutating a just-hydrated `<a>` node
      // (adding aria-current) in that same tick trips React's hydration
      // mismatch warning. One rAF lets the commit finish first.
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        recompute();
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf) window.cancelAnimationFrame(raf);
      });
    }

    // ---- reading-progress rAF fallback -----------------------------------
    const bars = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reading-progress]"),
    );
    // CSS `animation-timeline: scroll()` drives these natively where supported;
    // only run the JS fallback when it isn't.
    const supportsScrollTimeline =
      typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()");
    if (bars.length > 0 && !supportsScrollTimeline) {
      let raf = 0;
      const update = () => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
        for (const bar of bars) bar.style.setProperty("--reading-progress", String(pct));
      };
      const onScroll = () => {
        if (!raf) raf = window.requestAnimationFrame(update);
      };
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf) window.cancelAnimationFrame(raf);
      });
    }

    // ---- jump-to-top reveal ----------------------------------------------
    const jumps = Array.from(document.querySelectorAll<HTMLElement>("[data-jump-top]"));
    if (jumps.length > 0) {
      // Number.isFinite (not ||) so a configured showAfter of 0 is honoured.
      const thresholds = jumps.map((el) => {
        const n = Number(el.getAttribute("data-jump-top"));
        return Number.isFinite(n) ? n : 400;
      });
      let raf = 0;
      const update = () => {
        raf = 0;
        const y = window.scrollY;
        jumps.forEach((el, i) => {
          el.toggleAttribute("data-visible", y > thresholds[i]!);
        });
      };
      const onScroll = () => {
        if (!raf) raf = window.requestAnimationFrame(update);
      };
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        if (raf) window.cancelAnimationFrame(raf);
      });
    }

    // ---- motion: entrance animations (load / in-view, optional stagger) --------
    // Blocks with a `motion` layer carry [data-motion-trigger]; the scoped CSS holds
    // their initial hidden state (gated on data-blocks-enhanced + no-reduced-motion).
    // Here we flip [data-motion-in] to play the transition. Under reduced-motion we do
    // NOTHING — the CSS guard already leaves the element in its final (visible) state.
    if (!prefersReducedMotion) {
      const reveal = (el: HTMLElement) => el.setAttribute("data-motion-in", "");

      // Stagger containers orchestrate their DIRECT motion children: when the container
      // enters view, reveal each child in sequence, overriding the child's own trigger.
      const staggerRoots = Array.from(
        document.querySelectorAll<HTMLElement>("[data-motion-stagger]"),
      );
      const staggered = new Set<HTMLElement>();
      for (const root of staggerRoots) {
        const step = Number(root.getAttribute("data-motion-stagger")) || 0;
        // Direct children carrying motion. querySelectorAll is descendant-wide, so filter
        // to direct children (a nested stagger container owns its own subtree).
        const kids = Array.from(root.querySelectorAll<HTMLElement>("[data-motion-trigger]")).filter(
          (k) => k.parentElement === root || k.closest("[data-motion-stagger]") === root,
        );
        kids.forEach((k) => staggered.add(k));
      }

      // Load-triggered elements: reveal on the next frame (after first paint), minus any
      // that a stagger container owns.
      const loadEls = Array.from(
        document.querySelectorAll<HTMLElement>('[data-motion-trigger="load"]'),
      ).filter((el) => !staggered.has(el));
      if (loadEls.length) {
        const raf = window.requestAnimationFrame(() => loadEls.forEach(reveal));
        cleanups.push(() => window.cancelAnimationFrame(raf));
      }

      // In-view elements (and stagger containers): reveal when they scroll into view.
      const observed = [
        ...Array.from(document.querySelectorAll<HTMLElement>('[data-motion-trigger="in-view"]')).filter(
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
                // Stagger: reveal each direct motion child in sequence.
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
        // No IntersectionObserver (very old browser): reveal everything immediately so
        // nothing stays hidden.
        observed.forEach(reveal);
      }
    }

    // ---- tabs: upgrade the progressive-enhancement panels into an ARIA tablist --
    const tabGroups = Array.from(document.querySelectorAll<HTMLElement>("[data-tabs]"));
    for (const group of tabGroups) {
      const tabs = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="tab"][data-tab-index]'));
      const panels = Array.from(group.querySelectorAll<HTMLElement>("[data-tab-panel]"));
      if (tabs.length === 0 || panels.length === 0) continue;

      const select = (idx: number) => {
        tabs.forEach((t, i) => {
          const on = i === idx;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
        });
        // Hide inactive panels' content (the last child is the .panel body; its
        // fallback label is already CSS-hidden once enhanced).
        panels.forEach((p, i) => {
          const body = p.lastElementChild as HTMLElement | null;
          if (body) body.toggleAttribute("hidden", i !== idx);
        });
      };
      // Initial: activate the first tab, hide the rest.
      select(0);

      tabs.forEach((tab, i) => {
        const onClick = () => select(i);
        const onKey = (e: KeyboardEvent) => {
          const last = tabs.length - 1;
          let next = -1;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = last;
          if (next >= 0) {
            e.preventDefault();
            select(next);
            tabs[next]!.focus();
          }
        };
        tab.addEventListener("click", onClick);
        tab.addEventListener("keydown", onKey);
        cleanups.push(() => {
          tab.removeEventListener("click", onClick);
          tab.removeEventListener("keydown", onKey);
        });
      });
    }

    // ---- before/after slider: mirror the range value onto --ba-pos -------------
    const baSliders = Array.from(document.querySelectorAll<HTMLElement>("[data-before-after]"));
    for (const wrap of baSliders) {
      const range = wrap.querySelector<HTMLInputElement>("[data-before-after-range]");
      if (!range) continue;
      const sync = () => wrap.style.setProperty("--ba-pos", `${range.value}%`);
      sync();
      range.addEventListener("input", sync);
      cleanups.push(() => range.removeEventListener("input", sync));
    }

    // ---- lottie: dynamically load lottie-web (optional dep) and play -----------
    // The import is wrapped: if the customer removed lottie-web, the catch leaves the
    // mounts empty — never a runtime crash. Reduced-motion loads the animation but does
    // not autoplay (shows the first frame). Cleanup destroys players on navigation.
    const lottieMounts = Array.from(document.querySelectorAll<HTMLElement>("[data-lottie]"));
    if (lottieMounts.length > 0) {
      let cancelled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const players: any[] = [];
      const io =
        "IntersectionObserver" in window
          ? new IntersectionObserver(
              (entries, obs) => {
                for (const e of entries) {
                  if (!e.isIntersecting) continue;
                  obs.unobserve(e.target);
                  (e.target as HTMLElement & { __play?: () => void }).__play?.();
                }
              },
              { threshold: 0.2 },
            )
          : null;

      import("lottie-web")
        .then((mod) => {
          if (cancelled) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lottie = (mod as any).default ?? mod;
          for (const el of lottieMounts) {
            const src = el.getAttribute("data-lottie-src");
            if (!src) continue;
            const loop = el.getAttribute("data-lottie-loop") === "1";
            const trigger = el.getAttribute("data-lottie-trigger") ?? "in-view";
            const autoplay = trigger === "load" && !prefersReducedMotion;
            let anim: { play?: () => void; destroy?: () => void } | null = null;
            try {
              anim = lottie.loadAnimation({
                container: el,
                renderer: "svg",
                loop,
                autoplay,
                path: src,
              });
            } catch {
              continue;
            }
            if (anim) players.push(anim);
            // For in-view (and reduced-motion is respected: we only wire a play on
            // intersect when motion isn't reduced), arm the observer.
            if (trigger === "in-view" && !prefersReducedMotion && io && anim) {
              (el as HTMLElement & { __play?: () => void }).__play = () => anim!.play?.();
              io.observe(el);
            }
          }
        })
        .catch(() => {
          /* lottie-web not installed → leave mounts empty (graceful degradation). */
        });

      cleanups.push(() => {
        cancelled = true;
        io?.disconnect();
        for (const p of players) p.destroy?.();
      });
    }

    // ---- countdown: tick each second toward the target instant -----------------
    const countdowns = Array.from(document.querySelectorAll<HTMLElement>("[data-countdown]"));
    for (const cd of countdowns) {
      const target = Date.parse(cd.getAttribute("data-countdown-target") ?? "");
      if (Number.isNaN(target)) continue;
      const timer = cd.querySelector<HTMLElement>("[data-countdown-timer]");
      const expired = cd.querySelector<HTMLElement>("[data-countdown-expired]");
      const unitEls = new Map<string, HTMLElement>();
      cd.querySelectorAll<HTMLElement>("[data-countdown-unit]").forEach((el) =>
        unitEls.set(el.getAttribute("data-countdown-unit")!, el),
      );
      const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
      let interval = 0;
      const tick = () => {
        const now = Date.now();
        const diff = target - now;
        if (diff <= 0) {
          if (timer) timer.hidden = true;
          if (expired) expired.hidden = false;
          if (interval) window.clearInterval(interval);
          return;
        }
        const totalSec = Math.floor(diff / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        const vals: Record<string, string> = {
          days: String(days),
          hours: pad(hours),
          minutes: pad(minutes),
          seconds: pad(seconds),
        };
        for (const [unit, el] of unitEls) el.textContent = vals[unit] ?? "--";
      };
      tick();
      interval = window.setInterval(tick, 1000);
      cleanups.push(() => window.clearInterval(interval));
    }

    // ---- animated counters: count up from 0 when scrolled into view ------------
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-counter]"));
    if (counters.length > 0 && "IntersectionObserver" in window) {
      const group = (n: number, decimals: number) => {
        const [int, frac] = n.toFixed(decimals).split(".");
        const g = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return frac ? `${g}.${frac}` : g;
      };
      const run = (el: HTMLElement) => {
        const to = Number(el.getAttribute("data-counter-to")) || 0;
        const decimals = Number(el.getAttribute("data-counter-decimals")) || 0;
        const duration = Number(el.getAttribute("data-counter-duration")) || 0;
        // Reduced-motion or zero duration: snap to the final value (already rendered).
        if (prefersReducedMotion || duration <= 0) {
          el.textContent = group(to, decimals);
          return;
        }
        let startTs = 0;
        let raf = 0;
        const tick = (ts: number) => {
          if (!startTs) startTs = ts;
          const p = Math.min(1, (ts - startTs) / duration);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = group(to * eased, decimals);
          if (p < 1) raf = window.requestAnimationFrame(tick);
        };
        el.textContent = group(0, decimals);
        raf = window.requestAnimationFrame(tick);
        cleanups.push(() => raf && window.cancelAnimationFrame(raf));
      };
      const io = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            obs.unobserve(entry.target);
            run(entry.target as HTMLElement);
          }
        },
        { threshold: 0.4 },
      );
      counters.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // ---- poll voting (progressive enhancement) — extracted to poll-enhance.ts
    // (each [data-poll] has a complete no-JS fallback; this only adds voting).
    cleanups.push(...enhancePolls(document));

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
