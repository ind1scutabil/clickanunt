import type { IsoDateTimeString } from './common';

/**
 * GET /api/users/me — success body (flat user object; see app/api/users/me/route.ts).
 */
export type UserMeResponseDto = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  accountType: string;
  createdAt: IsoDateTimeString;
  trustScore: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  creditsBalance: number;
  promotionDiscountPercent: number;
  promotionBenefits: unknown;
};

/**
 * POST /api/auth/login — 200 success JSON (tokens also set as httpOnly cookies).
 * `user` is the DB user without password (may include more keys than GET /api/users/me).
 */
export type LoginSuccessResponseDto = {
  success: true;
  user: UserMeResponseDto;
  accessToken: string;
  refreshToken: string;
  message?: string;
};

/**
 * POST /api/auth/login — 206 when admin requires 2FA (see login route).
 */
export type LoginRequires2FAResponseDto = {
  requiresTwoFactor: true;
  sessionToken: string;
  message?: string;
};

export type AuthTokensDto = {
  accessToken: string;
  refreshToken?: string;
};

/**
 * POST /api/auth/refresh and POST /api/auth/mobile-refresh — new access token (refresh token unchanged).
 */
export type RefreshAccessTokenResponseDto = {
  success: true;
  accessToken: string;
  user: UserMeResponseDto;
};
