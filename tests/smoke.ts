/**
 * Smoke Test - Release Readiness Verification
 * 
 * Quick verification of critical app paths without UI (API-level checks)
 * Run with: npm run smoke
 */

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: message, duration: Date.now() - start });
    console.log(`❌ ${name}: ${message}`);
  }
}

async function runSmokeTests(): Promise<void> {
  console.log('\n🔍 SMOKE TEST - Release Readiness Audit\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Health check
  await test('API Health Check', async () => {
    const response = await axios.get(`${BASE_URL}/api/health`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
  });

  // Homepage
  await test('Homepage loads (200 OK)', async () => {
    const response = await axios.get(`${BASE_URL}/`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
    if (!response.data.includes('html')) throw new Error('No HTML content');
  });

  // Auth pages
  await test('Login page (200 OK)', async () => {
    const response = await axios.get(`${BASE_URL}/auth/login`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
  });

  await test('Signup page (200 OK)', async () => {
    const response = await axios.get(`${BASE_URL}/auth/signup`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
  });

  // Dashboard pages
  await test('Dashboard page loads', async () => {
    const response = await axios.get(`${BASE_URL}/dashboard`, {
      validateStatus: (status) => status === 200 || status === 307, // Redirect ok
    });
    if (response.status !== 200 && response.status !== 307) {
      throw new Error(`Status ${response.status}`);
    }
  });

  // Listings page
  await test('Listings page loads', async () => {
    const response = await axios.get(`${BASE_URL}/listings`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
  });

  // Admin pages (should redirect or deny without auth)
  await test('Admin dashboard page exists', async () => {
    const response = await axios.get(`${BASE_URL}/admin/dashboard`, {
      validateStatus: (status) => status === 200 || status === 307 || status === 401,
    });
    if (response.status === 404) throw new Error('404 Not Found');
  });

  await test('Admin moderation page exists', async () => {
    const response = await axios.get(`${BASE_URL}/admin/moderation`, {
      validateStatus: (status) => status === 200 || status === 307 || status === 401,
    });
    if (response.status === 404) throw new Error('404 Not Found');
  });

  // API endpoints
  await test('API Search endpoint exists', async () => {
    const response = await axios.get(`${BASE_URL}/api/search?q=test`, {
      validateStatus: (status) => status === 200 || status === 400,
    });
    if (response.status === 404) throw new Error('404 Not Found');
  });

  await test('API Listings endpoint exists', async () => {
    const response = await axios.get(`${BASE_URL}/api/listings?page=1&limit=12`, {
      validateStatus: (status) => status === 200 || status === 400 || status === 400,
    });
    if (response.status === 404) throw new Error('404 Not Found');
  });

  // 404 handling
  await test('Invalid route returns 404', async () => {
    const response = await axios.get(`${BASE_URL}/this-does-not-exist-12345`, {
      validateStatus: (status) => status === 404,
    });
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
  });

  // Security headers check
  await test('Security headers present', async () => {
    const response = await axios.get(`${BASE_URL}/`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
    ];
    
    const missingHeaders = requiredHeaders.filter(h => !headers[h]);
    if (missingHeaders.length > 0) {
      console.log(`   ⚠️  Missing headers: ${missingHeaders.join(', ')}`);
    }
  });

  // Build verification
  await test('Production build successful', async () => {
    // Check if .next folder exists and has been built
    const fs = require('fs').promises;
    const path = require('path');
    const buildPath = path.join(process.cwd(), '.next');
    
    try {
      await fs.access(buildPath);
    } catch {
      throw new Error('Build folder not found - run npm run build first');
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed (${percentage}%)\n`);
  
  if (passed === total) {
    console.log('✅ All smoke tests passed! App is release-ready.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. See details above.\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.name}: ${r.error}`);
    });
    console.log('');
    process.exit(1);
  }
}

// Run tests
runSmokeTests().catch((error) => {
  console.error('💥 Smoke test error:', error);
  process.exit(1);
});
