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
 * POST /api/auth/login, /register, /register-extended, /verify-2fa — 200 success JSON (web).
 * Tokens are set only as httpOnly cookies (`accessToken`, `refreshToken`); not returned in the body.
 * `user` is the DB user without password (may include more keys than GET /api/users/me).
 */
export type LoginSuccessResponseDto = {
  success: true;
  user: UserMeResponseDto;
  message?: string;
};

/**
 * POST /api/auth/mobile-login — 200 success JSON (mobile Bearer clients).
 * Does not set httpOnly cookies; tokens are returned in the body.
 */
export type MobileLoginSuccessResponseDto = {
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
 * POST /api/auth/refresh — 200 success JSON (web).
 * New access token is set only as an httpOnly cookie; body returns success + user.
 */
export type WebRefreshSuccessResponseDto = {
  success: true;
  user: UserMeResponseDto;
};

/**
 * POST /api/auth/mobile-refresh — rotated access + refresh tokens in JSON body.
 */
export type RefreshAccessTokenResponseDto = {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: UserMeResponseDto;
};
