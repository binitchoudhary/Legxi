const crypto = require('crypto');

async function testTiming() {
  const url = 'http://localhost:8080/api/v1/auth/login';
  
  const measure = async (email, password) => {
    const start = performance.now();
    await fetch(url, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({email, password})
    });
    return performance.now() - start;
  };

  let sumExisting = 0;
  let sumMissing = 0;
  const iterations = 30;

  for (let i = 0; i < iterations; i++) {
    sumExisting += await measure('admin@legxi.com', 'wrongpassword');
    sumMissing += await measure('missing@legxi.com', 'wrongpassword');
  }

  console.log(`Average Timing (Existing User, Wrong Password): ${(sumExisting / iterations).toFixed(2)} ms`);
  console.log(`Average Timing (Missing User): ${(sumMissing / iterations).toFixed(2)} ms`);
}

async function testConcurrentRefresh() {
  // First login to get a fresh token
  const res = await fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'admin@legxi.com', password: 'Password123!'})
  });
  const data = await res.json();
  const token = data.refreshToken;
  
  console.log('\n--- Concurrent Refresh Test ---');
  console.log('Got new token:', token);
  
  // Issue two simultaneous refresh requests
  const promise1 = fetch('http://localhost:8080/api/v1/auth/refresh', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshToken: token})
  }).then(r => r.json());

  const promise2 = fetch('http://localhost:8080/api/v1/auth/refresh', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshToken: token})
  }).then(r => r.json());

  const [res1, res2] = await Promise.all([promise1, promise2]);
  
  console.log('Response A:', res1);
  console.log('Response B:', res2);
}

async function run() {
  await testTiming();
  await testConcurrentRefresh();
}

run().catch(console.error);
