/**
 * Block-id generation for importers. Each importer owns one factory instance
 * (e.g. `makeBlockIdFactory("ghost")` → `ghost-import-1`, `ghost-import-2`, …),
 * replacing the per-module `let blockIdCounter` global the ghost/wxr mappers used.
 *
 * The `reset()` is load-bearing: `resetBlockIdCounter()` in each mapper delegates
 * to it, and tests call it in `beforeEach` and assert on exact ids
 * (`ghost-import-1`, `wxr-import-1`). Keep the `${prefix}-import-${n}` shape and
 * 1-based counter exactly — those strings are a tested contract.
 */
export function makeBlockIdFactory(prefix: string): { nextId: () => string; reset: () => void } {
  let n = 0;
  return {
    nextId: () => `${prefix}-import-${++n}`,
    reset: () => {
      n = 0;
    },
  };
}
