import jwt from 'jsonwebtoken';
import { ENV } from './src/config/env.js';
import app from './src/app.js';

console.log('\n--- Authentication & Security Tests ---\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

function generateToken(overrides = {}) {
  const payload = {
    iss: `https://${ENV.SHOPIFY_STORE}/admin`,
    dest: `https://${ENV.SHOPIFY_STORE}`,
    aud: ENV.SHOPIFY_API_KEY,
    sub: 'gid://shopify/User/123',
    ...overrides
  };
  return jwt.sign(payload, ENV.SHOPIFY_API_SECRET, { 
    algorithm: 'HS256', 
    expiresIn: '1h' 
  });
}

async function runTests() {
  const server = app.listen(0); // random port
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/partial-payment/create`;

  try {
    const validOrigin = `https://${ENV.SHOPIFY_STORE}`;
    
    // Test 1: Missing Authorization header
    let res = await fetch(baseUrl, { method: 'POST', headers: { origin: validOrigin } });
    assert(res.status === 401, 'Missing Authorization header rejected (401)');

    // Test 2: Invalid signature
    const badSigToken = jwt.sign({ iss: `https://${ENV.SHOPIFY_STORE}/admin`, dest: validOrigin, aud: ENV.SHOPIFY_API_KEY, sub: 'user1' }, 'wrong-secret');
    res = await fetch(baseUrl, { method: 'POST', headers: { authorization: `Bearer ${badSigToken}`, origin: validOrigin } });
    assert(res.status === 401, 'Invalid signature rejected (401)');

    // Test 3: Expired token
    const expToken = jwt.sign({ iss: `https://${ENV.SHOPIFY_STORE}/admin`, dest: validOrigin, aud: ENV.SHOPIFY_API_KEY, sub: 'user1', exp: Math.floor(Date.now() / 1000) - 120 }, ENV.SHOPIFY_API_SECRET);
    res = await fetch(baseUrl, { method: 'POST', headers: { authorization: `Bearer ${expToken}`, origin: validOrigin } });
    assert(res.status === 401, 'Expired token rejected (401)');

    // Test 4: Wrong shop (Invalid destination)
    const wrongDestToken = generateToken({ dest: 'https://hacker.myshopify.com' });
    res = await fetch(baseUrl, { method: 'POST', headers: { authorization: `Bearer ${wrongDestToken}`, origin: validOrigin } });
    assert(res.status === 403, 'Wrong shop destination rejected (403)');

    // Test 5: Valid JWT
    // NOTE: It will fail validation in the controller because payload is empty, but auth should pass (400 instead of 401)
    const validToken = generateToken();
    res = await fetch(baseUrl, { 
      method: 'POST', 
      headers: { authorization: `Bearer ${validToken}`, 'Content-Type': 'application/json', origin: validOrigin },
      body: JSON.stringify({}) 
    });
    // Controller returns 400 for empty payload if auth passes
    assert(res.status === 400, 'Valid JWT authenticated successfully');

    // Test 6: CORS (Wrong Origin)
    const badOrigin = 'https://malicious-site.com';
    res = await fetch(baseUrl, { 
      method: 'POST', 
      headers: { authorization: `Bearer ${validToken}`, origin: badOrigin }
    });
    // express cors middleware doesn't usually block the request completely without an explicit setup, 
    // but it strips the Access-Control-Allow-Origin header. Let's verify the header isn't the bad origin.
    const corsHeader = res.headers.get('access-control-allow-origin');
    assert(corsHeader !== badOrigin, 'CORS restricts cross-origin access');

    // Test 7: Rate limiting (10 requests)
    let rateLimited = false;
    for (let i = 0; i < 12; i++) {
      const iterRes = await fetch(baseUrl, { 
        method: 'POST', 
        headers: { authorization: `Bearer ${validToken}`, 'Content-Type': 'application/json', origin: validOrigin },
        body: JSON.stringify({}) 
      });
      if (iterRes.status === 429) rateLimited = true;
    }
    assert(rateLimited, 'Rate limiting (429) triggers after 10 requests');

  } catch (err) {
    console.error('\nTests crashed:', err);
  } finally {
    server.close();
    console.log(`\nResults: ${passCount} Passed, ${failCount} Failed\n`);
    if (failCount > 0) process.exit(1);
  }
}

runTests();
