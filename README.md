# x402check-cloudflare-agent

Cloudflare Agents / Workers **template** that calls [x402check](https://x402check.dev) **before any x402 payment**.

- `preflightCheck({ url })` → `ok|caution|avoid` + history
- `payIfSafe({ url })` → denies on `avoid`, stub settle otherwise
- `guardedPay(payFn)` helper for plain Workers

## Intent

Use this when your Cloudflare agent is about to settle / sign `PAYMENT-SIGNATURE`, needs to verify payTo on Base, detect wallet/price drift, or keep a budget guard.

## Quick start

```bash
npm install
npx wrangler dev
```

Set `X402CHECK_URL=https://x402check.dev` (default in `wrangler.toml`).

## Pay for checks

x402check charges **$0.002 USDC Exact per tool URL** on Base. Wire a `PAYMENT-SIGNATURE` (or facilitator) into `x402check-client` via `paymentHeaders` / your settle path. See https://x402check.dev/llms.txt

## Not

Not an OFAC/drainer/simulation wallet product — endpoint live 402 + history only.

## License

MIT
