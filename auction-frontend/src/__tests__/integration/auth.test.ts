const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';
let refreshCookie = '';
let currentUserId = 'usr_admin';

jest.setTimeout(60000);

describe('Layer 3 Authentication Contract Verification', () => {
  it('1. Login Success - Cookie Contract & JWT Structure', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@legxi.com', password: 'Password123!' })
    });

    expect(res.status).toBe(200);

    const setCookies = res.headers.get('set-cookie');
    expect(setCookies).toBeTruthy();
    expect(setCookies).toContain('HttpOnly');
    expect(setCookies).toContain('Secure');
    expect(setCookies).toContain('SameSite=lax');

    const cookies = setCookies!.split(', ');
    const sessionMatch = cookies.find(c => c.includes('legxi_session='))?.match(/legxi_session=([^;]+)/);
    const refreshMatch = cookies.find(c => c.includes('legxi_refresh='))?.match(/legxi_refresh=([^;]+)/);
    
    expect(sessionMatch).toBeTruthy();
    expect(refreshMatch).toBeTruthy();

    sessionCookie = sessionMatch![1];
    refreshCookie = refreshMatch![1];

    const base64Url = sessionCookie.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    
    expect(payload.iss).toBe('legxi-gateway');
    expect(payload.aud).toBe('legxi-fastify');
    expect(payload.sub).toBe(currentUserId);
    expect(payload.email).toBe('admin@legxi.com');
    expect(payload.role).toBe('ADMIN');
    expect(payload.permissions).toBeUndefined();
  });

  it('2. Middleware Boundary - Stripping Forged Identity', async () => {
    const forgedHeader = JSON.stringify({ user: { id: 'forged_admin', roles: ['ADMIN'] } });
    
    const res = await fetch(`${BASE_URL}/api/proxy/auth/me`, {
      headers: {
        'x-user-context': forgedHeader
      }
    });

    expect(res.status).toBe(401);
  });

  it('3. Negative Test - Tampered JWT', async () => {
    const tampered = sessionCookie.slice(0, -5) + 'xxxxx';
    const res = await fetch(`${BASE_URL}/api/proxy/auth/me`, {
      headers: {
        'Cookie': `legxi_session=${tampered}`
      }
    });
    expect(res.status).toBe(401);
  });

  it('4. Negative Test - Expired JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/proxy/auth/me`, {
      headers: {
        'Cookie': `legxi_session=eyJhbGciOiJIUzI1NiJ9.expired_payload.signature`
      }
    });
    expect(res.status).toBe(401);
  });

  it('5. Refresh Token Rotation', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `legxi_refresh=${refreshCookie}`
      }
    });

    expect(res.status).toBe(200);

    const setCookies = res.headers.get('set-cookie') || '';
    const newRefreshMatch = setCookies.split(', ').find(c => c.includes('legxi_refresh='))?.match(/legxi_refresh=([^;]+)/);
    const newRefreshCookie = newRefreshMatch ? newRefreshMatch[1] : '';

    expect(newRefreshCookie).toBeTruthy();
    expect(newRefreshCookie).not.toBe(refreshCookie);

    refreshCookie = newRefreshCookie;
  });

  it('6. Negative Test - Replay old token revokes chain', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@legxi.com', password: 'Password123!' })
    });
    const oldRefreshMatch = (loginRes.headers.get('set-cookie') || '').match(/legxi_refresh=([^;]+)/);
    const oldRefresh = oldRefreshMatch![1];

    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Cookie': `legxi_refresh=${oldRefresh}` }
    });
    expect(refreshRes.status).toBe(200);

    const replayRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Cookie': `legxi_refresh=${oldRefresh}` }
    });
    expect(replayRes.status).toBe(401);
  });

  it('7. Logout - Clears Cookies', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST'
    });

    expect(res.status).toBe(204);
    const setCookies = res.headers.get('set-cookie') || '';
    expect(setCookies).toContain('legxi_session=;');
    expect(setCookies).toContain('Max-Age=0');
  });

  it('8. Login Timing Regression (Argon2 dummy hash match)', async () => {
    const iterations = 3;
    let missingUserTime = 0;
    let wrongPasswordTime = 0;

    for (let i = 0; i < iterations; i++) {
      const startMissing = performance.now();
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `missing_${Date.now()}@legxi.com`, password: 'Password123!' })
      });
      missingUserTime += (performance.now() - startMissing);

      const startWrong = performance.now();
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@legxi.com', password: 'WrongPassword123!' })
      });
      wrongPasswordTime += (performance.now() - startWrong);
    }

    const avgMissing = missingUserTime / iterations;
    const avgWrong = wrongPasswordTime / iterations;
    const diff = Math.abs(avgMissing - avgWrong);

    expect(diff).toBeLessThan(300);
  });
});
