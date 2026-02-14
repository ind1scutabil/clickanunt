import { request as playwrightRequest, type FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const STORAGE_STATE_PATH = path.resolve(__dirname, '.auth/admin.json');

function getBaseURL(config: FullConfig): string {
  const projectBaseURL = config.projects?.[0]?.use?.baseURL;
  return (projectBaseURL as string) || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = getBaseURL(config);
  const adminEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@clickanunt.ro';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';

  const requestContext = await playwrightRequest.newContext({ baseURL });

  const csrfRes = await requestContext.get('/api/csrf');
  if (!csrfRes.ok()) {
    throw new Error(`Failed to fetch CSRF token (status ${csrfRes.status()})`);
  }

  const csrfData = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfData.csrfToken) {
    throw new Error('CSRF token missing in /api/csrf response');
  }

  const loginRes = await requestContext.post('/api/auth/login', {
    data: { email: adminEmail, password: adminPassword },
    headers: { 'x-csrf-token': csrfData.csrfToken },
  });

  const loginData = await loginRes.json();

  if (loginRes.status() === 206) {
    throw new Error(
      'Admin login requires 2FA. Disable ADMIN_2FA_ENABLED in test env or use a non-2FA admin user for E2E.'
    );
  }

  if (loginRes.status() !== 200) {
    const errorMessage = loginData?.error?.message || loginData?.error || loginData?.message || 'Unknown login error';
    throw new Error(`Admin login failed (${loginRes.status()}): ${errorMessage}`);
  }

  const storageState = await requestContext.storageState();
  await requestContext.dispose();

  const origin = new URL(baseURL).origin;
  const user = loginData?.user;
  const accessToken = loginData?.accessToken;
  const refreshToken = loginData?.refreshToken;

  storageState.origins = storageState.origins || [];
  const existingOrigin = storageState.origins.find((o) => o.origin === origin);
  const targetOrigin = existingOrigin || { origin, localStorage: [] as { name: string; value: string }[] };

  const setLocalStorageItem = (name: string, value: string | undefined) => {
    if (!value) return;
    const index = targetOrigin.localStorage.findIndex((item) => item.name === name);
    const entry = { name, value };
    if (index >= 0) {
      targetOrigin.localStorage[index] = entry;
    } else {
      targetOrigin.localStorage.push(entry);
    }
  };

  if (user) {
    setLocalStorageItem('user', JSON.stringify(user));
  }
  setLocalStorageItem('accessToken', accessToken);
  setLocalStorageItem('refreshToken', refreshToken);

  if (!existingOrigin) {
    storageState.origins.push(targetOrigin);
  }

  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2), 'utf-8');
}
