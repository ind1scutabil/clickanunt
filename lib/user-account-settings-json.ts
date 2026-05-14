/**
 * Preferințe cont stocate în `User.promotionBenefits` sub cheia `accountSettings`,
 * fără a șterge `promotions` setate de admin.
 */

export type AccountNotificationPrefs = {
  email: boolean;
  sms: boolean;
  push: boolean;
  newMessages: boolean;
  priceAlerts: boolean;
  newsletter: boolean;
};

export type AccountSettingsShape = {
  profile?: { location?: string | null };
  notifications?: Partial<AccountNotificationPrefs>;
};

const DEFAULT_NOTIFICATIONS: AccountNotificationPrefs = {
  email: true,
  sms: false,
  push: true,
  newMessages: true,
  priceAlerts: true,
  newsletter: false,
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export function getAccountSettingsFromBenefits(
  promotionBenefits: unknown
): { location: string; notifications: AccountNotificationPrefs } {
  const root = asRecord(promotionBenefits);
  const ac = asRecord(root.accountSettings);
  const profile = asRecord(ac.profile);
  const notif = asRecord(ac.notifications);

  const notifications: AccountNotificationPrefs = {
    ...DEFAULT_NOTIFICATIONS,
    ...(notif as Partial<AccountNotificationPrefs>),
  };

  return {
    location: typeof profile.location === "string" ? profile.location : "",
    notifications,
  };
}

export function mergeAccountSettingsIntoBenefits(
  promotionBenefits: unknown,
  patch: AccountSettingsShape
): Record<string, unknown> {
  const root = asRecord(promotionBenefits);
  const prevAc = asRecord(root.accountSettings);
  const prevProfile = asRecord(prevAc.profile);
  const prevNotif = asRecord(prevAc.notifications);

  const nextProfile = {
    ...prevProfile,
    ...(patch.profile !== undefined ? patch.profile : {}),
  };

  const nextNotif = {
    ...DEFAULT_NOTIFICATIONS,
    ...prevNotif,
    ...(patch.notifications !== undefined ? patch.notifications : {}),
  };

  const nextAc = {
    ...prevAc,
    profile: nextProfile,
    notifications: nextNotif,
  };

  return {
    ...root,
    accountSettings: nextAc,
  };
}
