/** Eveniment document pentru sincronizare UI după login/logout în același tab (localStorage nu emite `storage` pe același tab). */
export const CLICKANUNT_AUTH_SESSION_EVENT = "clickanunt:auth-session-changed";

export function broadcastAuthSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLICKANUNT_AUTH_SESSION_EVENT));
}
