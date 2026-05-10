/**
 * Citire Stripe din process.env cu nume construit din părți — evită inlining-ul webpack
 * de la `next build` pentru `process.env.STRIPE_SECRET_KEY`, care îngheață valoarea
 * din `.env` de la momentul buildului. După schimbarea cheilor pe VPS ai nevoie doar de
 * `pm2 reload`, nu și de rebuild, dacă aceste variabile sunt citite dinamic.
 */
function runtimeEnv(parts: readonly string[]): string | undefined {
  const name = parts.join('_');
  return process.env[name];
}

/** Secret API (sk_* / rk_*) — mereu din env-ul procesului curent la primul apel Stripe */
export function getStripeSecretKeyRuntime(): string | undefined {
  return runtimeEnv(['STRIPE', 'SECRET', 'KEY'])?.trim();
}

export function getStripeWebhookSecretRuntime(): string | undefined {
  return runtimeEnv(['STRIPE', 'WEBHOOK', 'SECRET'])?.trim();
}

/** Cheie publică pk_* */
export function getStripePublishableKeyRuntime(): string {
  return (
    runtimeEnv(['STRIPE', 'PUBLISHABLE', 'KEY'])?.trim() ||
    runtimeEnv(['NEXT', 'PUBLIC', 'STRIPE', 'PUBLISHABLE', 'KEY'])?.trim() ||
    ''
  );
}
