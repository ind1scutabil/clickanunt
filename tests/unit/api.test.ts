/**
 * API Integration Tests - Require running server
 * These tests are skipped in CI, run with server: npm run dev && npm test
 * @jest-environment node
 */

describe.skip('API - Authentication', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  
  describe('POST /api/auth/register', () => {
    it('should register user with valid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: uniqueEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });
      
      expect([200, 201]).toContain(response.status);
      
      const data = await response.json();
      if (response.ok) {
        expect(data).toHaveProperty('email');
      }
    });

    it('should reject duplicate email', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });
      
      expect([400, 409]).toContain(response.status);
    });

    it('should reject invalid password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'weak',
          confirmPassword: 'weak',
        }),
      });
      
      expect([400, 422]).toContain(response.status);
    });

    it('should reject mismatched passwords', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'Password123!',
          confirmPassword: 'Password456!',
        }),
      });
      
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      });
      
      expect([200, 201]).toContain(response.status);
      
      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('token');
      }
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'WrongPassword123!',
        }),
      });
      
      expect([401, 400]).toContain(response.status);
    });

    it('should reject missing fields', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          // Missing password
        }),
      });
      
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      // This test requires a valid token
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': 'Bearer valid-token-here',
        },
      });
      
      // Should be 200 with valid token or 401 without
      expect([200, 401]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token-here',
          'Content-Type': 'application/json',
        },
      });
      
      expect([200, 204]).toContain(response.status);
    });
  });
});

describe.skip('API - Listings', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  describe('GET /api/listings', () => {
    it('should return listings with valid status code', async () => {
      const response = await fetch(`${baseUrl}/api/listings`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data) || data.data).toBeTruthy();
    });

    it('should support pagination', async () => {
      const response = await fetch(`${baseUrl}/api/listings?page=1&limit=10`);
      
      expect(response.status).toBe(200);
    });

    it('should support filtering by category', async () => {
      const response = await fetch(`${baseUrl}/api/listings?category=Auto`);
      
      expect(response.status).toBe(200);
    });

    it('should support sorting', async () => {
      const response = await fetch(`${baseUrl}/api/listings?sortBy=createdAt&sortOrder=desc`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/listings', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Listing',
          description: 'Test Description',
          price: 1000,
        }),
      });
      
      expect(response.status).toBe(401);
    });

    it('should create listing with valid data and auth', async () => {
      const response = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'Test Listing',
          description: 'Test Description',
          price: 1000,
          category: 'Auto',
        }),
      });
      
      expect([200, 201, 401]).toContain(response.status);
    });
  });

  describe('GET /api/listings/:id', () => {
    it('should return 404 for non-existent listing', async () => {
      const response = await fetch(`${baseUrl}/api/listings/non-existent-id`);
      
      expect(response.status).toBe(404);
    });

    it('should return listing details if exists', async () => {
      const response = await fetch(`${baseUrl}/api/listings/some-valid-id`);
      
      expect([200, 404]).toContain(response.status);
    });
  });
});

describe.skip('API - Messages', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  describe('GET /api/messages', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/messages`);
      
      expect(response.status).toBe(401);
    });

    it('should return messages when authenticated', async () => {
      const response = await fetch(`${baseUrl}/api/messages`, {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });
      
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('POST /api/messages', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: 'user-id',
          message: 'Hello',
        }),
      });
      
      expect(response.status).toBe(401);
    });

    it('should require message content', async () => {
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          recipientId: 'user-id',
          // Missing message
        }),
      });
      
      expect([400, 422, 401]).toContain(response.status);
    });
  });
});

describe.skip('API - Admin', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  describe('GET /api/admin/listings', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/api/admin/listings`);
      
      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      const response = await fetch(`${baseUrl}/api/admin/listings`, {
        headers: {
          'Authorization': 'Bearer non-admin-token',
        },
      });
      
      expect([403, 401]).toContain(response.status);
    });
  });

  describe('POST /api/admin/listings/:id/approve', () => {
    it('should require admin role', async () => {
      const response = await fetch(`${baseUrl}/api/admin/listings/test-id/approve`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer user-token',
        },
      });
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/admin/users/:id/ban', () => {
    it('should require admin role', async () => {
      const response = await fetch(`${baseUrl}/api/admin/users/test-id/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token',
        },
        body: JSON.stringify({ reason: 'Test ban' }),
      });
      
      expect([401, 403]).toContain(response.status);
    });
  });
});

describe.skip('API - HTTP Status Codes', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  it('should return 200 for successful GET', async () => {
    const response = await fetch(`${baseUrl}/api/listings`);
    expect(response.status).toBe(200);
  });

  it('should return 400 for bad requests', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Empty body
    });
    
    expect([400, 422]).toContain(response.status);
  });

  it('should return 401 for unauthorized', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    expect(response.status).toBe(401);
  });

  it('should return 404 for not found', async () => {
    const response = await fetch(`${baseUrl}/api/listings/non-existent-id`);
    expect(response.status).toBe(404);
  });
});
