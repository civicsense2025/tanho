// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave, type UseAutosaveOptions, type UseAutosaveResult } from "./useAutosave";

type AnyResult = UseAutosaveResult<unknown>;
type AnyOptions = UseAutosaveOptions<unknown>;

const resultRef = { current: null as AnyResult | null };

function result(): AnyResult {
  if (!resultRef.current) throw new Error("Harness not rendered");
  return resultRef.current;
}

function Harness({ opts }: { opts: AnyOptions }) {
  const hookResult = useAutosave(opts);
  useEffect(() => {
    resultRef.current = hookResult;
  }, [hookResult]);
  return null;
}

let container: HTMLDivElement;
let root: Root;

function render(opts: AnyOptions) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(createElement(Harness, { opts }));
  });
}

function unmount() {
  act(() => {
    root.unmount();
  });
  container.remove();
}

async function flushTimers() {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unmount();
    vi.useRealTimers();
  });

  it("diff gate skips save when data matches baseline", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render({ save });

    act(() => result().resetBaseline({ a: 1 }));
    act(() => result().schedule({ a: 1 }));
    expect(save).not.toHaveBeenCalled();

    act(() => result().schedule({ a: 2 }));
    await flushTimers();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ a: 2 });
  });

  it("debounce waits before saving", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render({ save });

    act(() => result().schedule({ a: 1 }));
    expect(save).not.toHaveBeenCalled();

    await advance(1999);
    expect(save).not.toHaveBeenCalled();

    await advance(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("structural change saves faster than text change", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render({ save });

    act(() => result().schedule({ a: 1 }, "structural"));
    await advance(399);
    expect(save).not.toHaveBeenCalled();
    await advance(1);
    expect(save).toHaveBeenCalledTimes(1);

    save.mockClear();
    act(() => result().schedule({ a: 2 }, "text"));
    await advance(1999);
    expect(save).not.toHaveBeenCalled();
    await advance(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush saves immediately and returns true", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render({ save });

    act(() => result().schedule({ a: 1 }));
    expect(save).not.toHaveBeenCalled();

    let ok = false;
    await act(async () => {
      ok = await result().flush();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("retries with backoff and eventually succeeds", async () => {
    const save = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: "boom" })
      .mockResolvedValueOnce({ ok: false, error: "boom" })
      .mockResolvedValueOnce({ ok: true });
    render({ save });

    act(() => result().schedule({ a: 1 }));
    await flushTimers();

    expect(save).toHaveBeenCalledTimes(3);
    expect(result().saveState).toBe("saved");
  });

  it("surfaces error after max retries", async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, error: "down" });
    render({ save, maxRetries: 3 });

    act(() => result().schedule({ a: 1 }));
    await flushTimers();

    expect(save).toHaveBeenCalledTimes(4);
    expect(result().saveState).toBe("error");
    expect(result().errorMessage).toBe("down");
  });

  it("coalesces rapid schedules into one save with latest data", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render({ save });

    act(() => result().schedule({ a: 1 }));
    act(() => result().schedule({ a: 2 }));
    act(() => result().schedule({ a: 3 }));
    await flushTimers();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ a: 3 });
  });

  it("resetBaseline prevents save for unchanged data", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render({ save });

    act(() => result().schedule({ a: 1 }));
    await flushTimers();
    expect(save).toHaveBeenCalledTimes(1);

    act(() => result().resetBaseline({ a: 1 }));
    save.mockClear();

    act(() => result().schedule({ a: 1 }));
    await flushTimers();
    expect(save).not.toHaveBeenCalled();
  });
});
