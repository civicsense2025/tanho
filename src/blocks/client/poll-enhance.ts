/**
 * Poll voting — progressive enhancement for the `poll` block. Each [data-poll]
 * renders its options as buttons server-side (a complete no-JS fallback); this
 * adds click-to-vote with a one-time localStorage vote per poll and CSS result
 * bars (--poll-pct). No backend, no PII. Called once from BlockEnhancements;
 * returns cleanups to run on unmount / navigation.
 */
export function enhancePolls(root: ParentNode): Array<() => void> {
  const cleanups: Array<() => void> = [];
  const polls = root.querySelectorAll<HTMLElement>("[data-poll]");

  for (const poll of polls) {
    const key = `oys-poll:${poll.getAttribute("data-poll")}`;
    const options = Array.from(poll.querySelectorAll<HTMLButtonElement>("[data-poll-option]"));
    if (options.length < 2) continue;

    const showResults = (myChoice: number | null) => {
      const counts = options.map((el) => Number(el.getAttribute("data-seed") || 0));
      if (myChoice != null && counts[myChoice] != null) counts[myChoice]! += 1;
      const total = counts.reduce((a, b) => a + b, 0) || 1;
      options.forEach((el, i) => {
        const pct = Math.round((counts[i]! / total) * 100);
        el.style.setProperty("--poll-pct", `${pct}%`);
        const label = el.querySelector<HTMLElement>("[data-poll-pct-label]");
        if (label) {
          label.textContent = `${pct}%`;
          label.style.opacity = "1";
        }
        el.setAttribute("aria-pressed", String(i === myChoice));
        if (i === myChoice) el.setAttribute("data-poll-mine", "");
      });
    };

    let stored: number | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      stored = raw == null ? null : Number(raw);
    } catch {
      stored = null;
    }

    if (stored != null && !Number.isNaN(stored)) {
      options.forEach((el) => (el.disabled = true));
      showResults(stored);
    } else {
      options.forEach((el, i) => {
        const onClick = () => {
          try {
            window.localStorage.setItem(key, String(i));
          } catch {
            /* private mode — vote still shows for this view */
          }
          options.forEach((o) => (o.disabled = true));
          showResults(i);
        };
        el.addEventListener("click", onClick);
        cleanups.push(() => el.removeEventListener("click", onClick));
      });
    }
  }

  return cleanups;
}
