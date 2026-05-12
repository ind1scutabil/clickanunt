/**
 * Producție: stocarea locală a pozelor în `public/uploads` este ștearsă de `git clean -fd`
 * dacă nu e exclus `public/uploads`. Preferă S3/R2 (variabile în `lib/storage.ts`).
 */
export function warnIfProductionUsesLocalDiskUploads(): void {
  if (process.env.NODE_ENV !== "production") return;

  const id = process.env.S3_ACCESS_KEY_ID?.trim();
  const secret = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const hasS3 = !!(id && secret && bucket);

  if (hasS3) return;

  console.warn(
    "[clickanunt] ATENȚIE PRODUCȚIE: S3 nu e configurat (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_BUCKET). " +
      "Upload-urile merg pe disc local sub public/uploads — vulnerabile la git clean și la redeploy. " +
      "Configurează stocare obiect sau păstrează backup-uri de volum."
  );
}
