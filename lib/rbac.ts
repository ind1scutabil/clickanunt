/**
 * RBAC - Role Based Access Control
 * Sistemul de permisiuni pentru owner control
 */

import { UserRole } from '@prisma/client';
import { TokenPayload } from './auth';

// Definim toate acțiunile posibile în sistem
export enum Permission {
  // Users
  USERS_VIEW_ALL = 'users.view.all',
  USERS_VIEW_OWN = 'users.view.own',
  USERS_CREATE = 'users.create',
  USERS_UPDATE_ANY = 'users.update.any',
  USERS_UPDATE_OWN = 'users.update.own',
  USERS_DELETE = 'users.delete',
  USERS_BAN = 'users.ban',
  USERS_CHANGE_ROLE = 'users.change_role',
  USERS_SET_ROLE = 'users.setRole',
  USERS_SET_TRUST_SCORE = 'users.setTrustScore',
  USERS_VIEW_SENSITIVE = 'users.viewSensitive', // IP, phone, etc.

  // Listings
  LISTINGS_VIEW_ALL = 'listings.view.all',
  LISTINGS_VIEW_OWN = 'listings.view.own',
  LISTINGS_CREATE = 'listings.create',
  LISTINGS_UPDATE_ANY = 'listings.update.any',
  LISTINGS_UPDATE_OWN = 'listings.update.own',
  LISTINGS_DELETE_ANY = 'listings.delete.any',
  LISTINGS_DELETE_OWN = 'listings.delete.own',
  LISTINGS_APPROVE = 'listings.approve',
  LISTINGS_REJECT = 'listings.reject',
  LISTINGS_FEATURE = 'listings.feature',
  LISTINGS_SHADOWBAN = 'listings.shadowban',

  // Moderation
  MODERATION_VIEW_QUEUE = 'moderation.viewQueue',
  MODERATION_ASSIGN = 'moderation.assign',
  MODERATION_REVIEW = 'moderation.review',
  MODERATION_APPROVE_REJECT = 'moderation.approveReject',
  MODERATION_ESCALATE = 'moderation.escalate',

  // Reports
  REPORTS_VIEW = 'reports.view',
  REPORTS_CREATE = 'reports.create',
  REPORTS_RESOLVE = 'reports.resolve',

  // Appeals
  APPEALS_VIEW_ALL = 'appeals.view.all',
  APPEALS_VIEW_OWN = 'appeals.view.own',
  APPEALS_CREATE = 'appeals.create',
  APPEALS_REVIEW = 'appeals.review',

  // Audit Logs
  AUDIT_LOGS_VIEW = 'audit.view',
  AUDIT_LOGS_EXPORT = 'audit.export',

  // Settings
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_UPDATE = 'settings.update',

  // Payments
  PAYMENTS_VIEW_ALL = 'payments.view.all',
  PAYMENTS_VIEW_OWN = 'payments.view.own',
  PAYMENTS_REFUND = 'payments.refund',

  // Analytics
  ANALYTICS_VIEW = 'analytics.view',
}

// Maparea permisiunilor pe roluri
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // USER - utilizator normal
  [UserRole.user]: [
    Permission.USERS_VIEW_OWN,
    Permission.USERS_UPDATE_OWN,
    Permission.LISTINGS_VIEW_ALL,
    Permission.LISTINGS_VIEW_OWN,
    Permission.LISTINGS_CREATE,
    Permission.LISTINGS_UPDATE_OWN,
    Permission.LISTINGS_DELETE_OWN,
    Permission.REPORTS_CREATE,
    Permission.APPEALS_VIEW_OWN,
    Permission.APPEALS_CREATE,
    Permission.PAYMENTS_VIEW_OWN,
  ],

  // DEALER - vânzător profesionist (mai multe anunțuri, featured)
  [UserRole.dealer]: [
    Permission.USERS_VIEW_OWN,
    Permission.USERS_UPDATE_OWN,
    Permission.LISTINGS_VIEW_ALL,
    Permission.LISTINGS_VIEW_OWN,
    Permission.LISTINGS_CREATE,
    Permission.LISTINGS_UPDATE_OWN,
    Permission.LISTINGS_DELETE_OWN,
    Permission.REPORTS_CREATE,
    Permission.APPEALS_VIEW_OWN,
    Permission.APPEALS_CREATE,
    Permission.PAYMENTS_VIEW_OWN,
    Permission.ANALYTICS_VIEW, // Poate vedea statistici proprii
  ],

  // SUPPORT - suport clienți
  [UserRole.support]: [
    Permission.USERS_VIEW_ALL,
    Permission.USERS_VIEW_OWN,
    Permission.USERS_UPDATE_OWN,
    Permission.LISTINGS_VIEW_ALL,
    Permission.LISTINGS_VIEW_OWN,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_RESOLVE, // Poate rezolva raportări simple
    Permission.APPEALS_VIEW_ALL,
    Permission.APPEALS_REVIEW, // Poate răspunde la contestații
  ],

  // MODERATOR - moderator conținut
  [UserRole.moderator]: [
    Permission.USERS_VIEW_ALL,
    Permission.LISTINGS_VIEW_ALL,
    Permission.LISTINGS_APPROVE,
    Permission.LISTINGS_REJECT,
    Permission.LISTINGS_DELETE_ANY, // Poate șterge orice listing
    Permission.MODERATION_VIEW_QUEUE,
    Permission.MODERATION_REVIEW,
    Permission.MODERATION_APPROVE_REJECT,
    Permission.MODERATION_ASSIGN, // Poate lua task-uri din queue
    Permission.REPORTS_VIEW,
    Permission.REPORTS_RESOLVE,
    Permission.APPEALS_VIEW_ALL,
  ],

  // FINANCE - gestionare financiară
  [UserRole.finance]: [
    Permission.PAYMENTS_VIEW_ALL,
    Permission.PAYMENTS_REFUND,
    Permission.ANALYTICS_VIEW,
    Permission.LISTINGS_VIEW_ALL,
    Permission.USERS_VIEW_ALL,
  ],

  // ADMIN - administrator
  [UserRole.admin]: [
    // Users
    Permission.USERS_VIEW_ALL,
    Permission.USERS_VIEW_OWN,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE_ANY,
    Permission.USERS_UPDATE_OWN,
    Permission.USERS_DELETE,
    Permission.USERS_BAN,
    Permission.USERS_CHANGE_ROLE,
    Permission.USERS_SET_TRUST_SCORE,
    Permission.USERS_VIEW_SENSITIVE,

    // Listings
    Permission.LISTINGS_VIEW_ALL,
    Permission.LISTINGS_UPDATE_ANY,
    Permission.LISTINGS_DELETE_ANY,
    Permission.LISTINGS_APPROVE,
    Permission.LISTINGS_REJECT,
    Permission.LISTINGS_FEATURE,
    Permission.LISTINGS_SHADOWBAN,

    // Moderation
    Permission.MODERATION_VIEW_QUEUE,
    Permission.MODERATION_ASSIGN,
    Permission.MODERATION_REVIEW,
    Permission.MODERATION_APPROVE_REJECT,
    Permission.MODERATION_ESCALATE,

    // Reports & Appeals
    Permission.REPORTS_VIEW,
    Permission.REPORTS_RESOLVE,
    Permission.APPEALS_VIEW_ALL,
    Permission.APPEALS_REVIEW,

    // Audit & Settings
    Permission.AUDIT_LOGS_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,

    // Payments & Analytics
    Permission.PAYMENTS_VIEW_ALL,
    Permission.PAYMENTS_REFUND,
    Permission.ANALYTICS_VIEW,
  ],

  // OWNER - control complet
  [UserRole.owner]: Object.values(Permission), // TOATE permisiunile
};

/**
 * Verifică dacă un rol are o permisiune
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Verifică dacă un user (din token) are o permisiune
 */
export function userHasPermission(user: TokenPayload | null, permission: Permission): boolean {
  if (!user) return false;
  return hasPermission(user.role as UserRole, permission);
}

/**
 * Verifică dacă un user are oricare din permisiunile date
 */
export function userHasAnyPermission(user: TokenPayload | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(p => hasPermission(user.role as UserRole, p));
}

/**
 * Verifică dacă un user are toate permisiunile date
 */
export function userHasAllPermissions(user: TokenPayload | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(p => hasPermission(user.role as UserRole, p));
}

/**
 * Middleware helper pentru verificare permisiune
 * Aruncă eroare dacă user-ul nu are permisiunea
 */
export function requirePermission(user: TokenPayload | null, permission: Permission): void {
  if (!userHasPermission(user, permission)) {
    throw new Error(`Permisiune lipsă: ${permission}`);
  }
}

/**
 * Middleware helper pentru verificare rol minim
 */
export function requireRole(user: TokenPayload | null, minRole: UserRole): void {
  if (!user) {
    throw new Error('Neautentificat');
  }

  const roleHierarchy = [
    UserRole.user,
    UserRole.dealer,
    UserRole.support,
    UserRole.moderator,
    UserRole.finance,
    UserRole.admin,
    UserRole.owner,
  ];

  const userRoleIndex = roleHierarchy.indexOf(user.role as UserRole);
  const requiredRoleIndex = roleHierarchy.indexOf(minRole);

  if (userRoleIndex < requiredRoleIndex) {
    throw new Error(`Rol insuficient. Necesar: ${minRole}`);
  }
}

/**
 * Verifică dacă user-ul este OWNER
 */
export function isOwner(user: TokenPayload | null): boolean {
  return user?.role === UserRole.owner;
}

/**
 * Verifică dacă user-ul este ADMIN sau OWNER
 */
export function isAdminOrOwner(user: TokenPayload | null): boolean {
  return user?.role === UserRole.admin || user?.role === UserRole.owner;
}

/**
 * Obține toate permisiunile unui rol
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Verifică dacă un user poate modifica un alt user
 */
export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  // OWNER poate modifica pe oricine
  if (actorRole === UserRole.owner) {
    return true;
  }

  // ADMIN poate modifica pe oricine EXCEPT owner
  if (actorRole === UserRole.admin && targetRole !== UserRole.owner) {
    return true;
  }

  return false;
}

/**
 * Verifică dacă un user poate seta un anumit rol
 */
export function canSetRole(actor: TokenPayload, newRole: UserRole): boolean {
  // Doar OWNER poate seta rol de OWNER
  if (newRole === UserRole.owner && actor.role !== UserRole.owner) {
    return false;
  }

  // Doar OWNER și ADMIN pot seta rol de ADMIN
  if (newRole === UserRole.admin && actor.role !== UserRole.owner && actor.role !== UserRole.admin) {
    return false;
  }

  // Altfel, user-ul trebuie să aibă permisiunea USERS_SET_ROLE
  return userHasPermission(actor, Permission.USERS_SET_ROLE);
}
