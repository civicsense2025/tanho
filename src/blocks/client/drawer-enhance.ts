/**
 * Mobile nav drawer niceties — progressive enhancement for the nav-menu's native
 * <details data-mobile-nav>. With JS off it fully works; here we LAYER the drawer
 * conveniences: Esc to close, scrim tap-to-close, body-scroll-lock while a
 * covering menu is open, and a focus-trap. Nothing gates content — every link is
 * already in the DOM.
 *
 * Extracted from BlockEnhancements to keep that island under the file-size cap;
 * returns cleanups to run on unmount / navigation.
 */
export function enhanceDrawers(root: ParentNode): Array<() => void> {
  const cleanups: Array<() => void> = [];
  const drawers = Array.from(root.querySelectorAll<HTMLDetailsElement>("[data-mobile-nav]"));

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
    // On user open/close of THIS details, re-evaluate the lock across all drawers.
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

  return cleanups;
}
