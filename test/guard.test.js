import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withPreflightPay } from "x402check-client";

describe("cloudflare agent preflight pattern", () => {
  it("denies avoid via withPreflightPay", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          url: "https://bad.example/x402",
          verdict: "avoid",
          history: { checks: 0 },
        }),
        { status: 200 },
      );
    try {
      const pay = withPreflightPay(async () => "paid", {
        baseUrl: "https://x402check.dev",
      });
      await assert.rejects(() => pay("https://bad.example/x402"), /avoid|deny/i);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
