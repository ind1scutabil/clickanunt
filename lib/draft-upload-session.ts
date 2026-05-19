const SESSION_KEY = "clickanunt_listing_upload_session_v1";

/** Stable folder id for all photos in one publish flow (matches listing id on create). */
export function getOrCreateDraftUploadSessionId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
      return existing;
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearDraftUploadSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
