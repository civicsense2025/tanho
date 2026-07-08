import { describe, expect, it } from "vitest";

import { readCapped } from "./fetch-feed.server";

/**
 * SECURITY GATE for the response-body size cap. `readCapped` must never buffer
 * an unbounded body into memory before checking the cap — a hostile feed host
 * streaming GBs would OOM the process before a post-hoc length check could run.
 * These tests assert:
 *  - a `Content-Length` over the cap is rejected with no body read at all;
 *  - a streaming body with no `Content-Length` is cancelled once it crosses the
 *    cap (not fully buffered);
 *  - a normal small feed decodes to the expected text;
 *  - the null-body fallback (some runtimes / mocks) still caps correctly.
 */

const MAX_FEED_BYTES = 10_000_000;

describe("readCapped — streaming size cap", () => {
  it("rejects upfront when Content-Length exceeds the cap, without reading the body", async () => {
    // A body accessor that throws if touched — proves the fast path reads no body.
    const res = {
      headers: new Headers({ "content-length": String(MAX_FEED_BYTES + 1) }),
      get body(): ReadableStream<Uint8Array> {
        throw new Error("body must not be accessed on the content-length fast path");
      },
      text: async (): Promise<string> => {
        throw new Error("text() must not be called on the content-length fast path");
      },
    } as unknown as Response;

    const result = await readCapped(res);
    expect(result).toEqual({ ok: false, error: "Feed is too large" });
  });

  it("cancels the reader once a headerless stream exceeds the cap (no full buffering)", async () => {
    // A pull-based INFINITE stream of 1MB chunks. readCapped must cancel the
    // reader after crossing the cap; if it buffered the whole body instead, this
    // test would hang forever waiting for a stream that never ends.
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1_000_000));
      },
    });
    const res = new Response(stream); // no Content-Length header

    const result = await readCapped(res);
    expect(result).toEqual({ ok: false, error: "Feed is too large" });
  });

  it("returns the decoded text for a normal small feed", async () => {
    const xml = '<?xml version="1.0"?><rss version="2.0"><channel>'
      + "<item><title>Post</title><link>https://example.com/post/</link></item>"
      + "</channel></rss>";
    const res = new Response(xml);

    const result = await readCapped(res);
    expect(result).toEqual({ ok: true, data: xml });
  });

  it("falls back to res.text() when res.body is null and still caps", async () => {
    const huge = "x".repeat(MAX_FEED_BYTES + 1);
    const res = {
      headers: new Headers(),
      body: null,
      text: async () => huge,
    } as unknown as Response;

    const over = await readCapped(res);
    expect(over).toEqual({ ok: false, error: "Feed is too large" });

    const small = "x".repeat(100);
    const resOk = {
      headers: new Headers(),
      body: null,
      text: async () => small,
    } as unknown as Response;
    const ok = await readCapped(resOk);
    expect(ok).toEqual({ ok: true, data: small });
  });
});
