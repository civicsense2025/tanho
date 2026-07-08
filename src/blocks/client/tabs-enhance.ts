/**
 * Tabs — upgrade the progressive-enhancement panels (server-rendered, all visible
 * with JS off) into an ARIA tablist: roving tabindex, arrow/Home/End keyboard nav,
 * and aria-selected + hidden inactive panels. Extracted from BlockEnhancements to
 * keep that island under the file-size cap; returns cleanups.
 */
export function enhanceTabs(root: ParentNode): Array<() => void> {
  const cleanups: Array<() => void> = [];
  const tabGroups = Array.from(root.querySelectorAll<HTMLElement>("[data-tabs]"));

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

  return cleanups;
}
