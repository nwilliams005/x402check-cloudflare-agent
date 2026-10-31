/**
 * Cloudflare Agents template — gate x402 payments with x402check.
 * https://x402check.dev · https://github.com/nwilliams005/x402check-cloudflare-agent
 */
import { Agent, routeAgentRequest, callable } from "agents";
import { preflight, assertPayable, withPreflightPay } from "x402check-client";

type Env = {
  AI: unknown;
  X402SafeAgent: DurableObjectNamespace;
  X402CHECK_URL?: string;
};

type State = {
  lastCheck: {
    url: string;
    verdict: string;
    payTo: string | null;
    at: string;
  } | null;
  denied: number;
  allowed: number;
};

export class X402SafeAgent extends Agent<Env, State> {
  initialState: State = {
    lastCheck: null,
    denied: 0,
    allowed: 0,
  };

  private baseUrl() {
    return this.env.X402CHECK_URL || "https://x402check.dev";
  }

  /** Trust-check a seller URL before paying. */
  @callable()
  async preflightCheck(input: { url: string; fresh?: boolean }) {
    if (!input?.url) throw new Error("url required");
    const check = await preflight(input.url, {
      baseUrl: this.baseUrl(),
      fresh: !!input.fresh,
    });
    this.setState({
      ...this.state,
      lastCheck: {
        url: check.url,
        verdict: check.verdict,
        payTo: (check as { payTo?: string | null }).payTo ?? null,
        at: new Date().toISOString(),
      },
    });
    return check;
  }

  /** Preflight then stub-settle only if payable. Replace stub with your Exact settle. */
  @callable()
  async payIfSafe(input: { url: string; allowCaution?: boolean }) {
    if (!input?.url) throw new Error("url required");
    const check = await preflight(input.url, { baseUrl: this.baseUrl() });
    try {
      assertPayable(check, { allowCaution: input.allowCaution !== false });
    } catch (e: any) {
      this.setState({ ...this.state, denied: (this.state.denied || 0) + 1 });
      return { paid: false, check, error: String(e?.message || e) };
    }
    this.setState({ ...this.state, allowed: (this.state.allowed || 0) + 1 });
    return {
      paid: true,
      check,
      note: "Replace settle stub with your PAYMENT-SIGNATURE flow",
    };
  }
}

/** Plain Worker helper (no Durable Object). */
export function guardedPay<T>(
  payFn: (sellerUrl: string, ...args: any[]) => Promise<T>,
  opts: { baseUrl?: string; allowCaution?: boolean } = {},
) {
  return withPreflightPay(payFn, {
    baseUrl: opts.baseUrl || "https://x402check.dev",
    allowCaution: opts.allowCaution !== false,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response(
        JSON.stringify({
          name: "x402check-cloudflare-agent",
          docs: "https://x402check.dev/llms.txt",
          hint: "Use Agent client against /agents/x402-safe-agent/:id",
        }),
        { headers: { "content-type": "application/json" } },
      )
    );
  },
};
