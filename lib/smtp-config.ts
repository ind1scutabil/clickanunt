/**
 * Shared SMTP password resolution.
 * Accept either SMTP_PASS or SMTP_PASSWORD so verification and invoices share config.
 */
export function resolveSmtpPassword(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const pass = env.SMTP_PASS?.trim() || env.SMTP_PASSWORD?.trim();
  return pass || undefined;
}

export function isSmtpTransportConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(
    env.SMTP_HOST?.trim() &&
      env.SMTP_USER?.trim() &&
      resolveSmtpPassword(env)
  );
}
