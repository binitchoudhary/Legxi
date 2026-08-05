const { performance } = require('perf_hooks');

async function measureP95(url, body, iterations = 100) {
  const timings = [];
  
  // Warm up
  for(let i=0; i<5; i++) {
    await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
  }

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch(url, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(body)
    });
    timings.push(performance.now() - start);
  }

  timings.sort((a, b) => a - b);
  const sum = timings.reduce((a, b) => a + b, 0);
  const avg = sum / iterations;
  const median = timings[Math.floor(iterations / 2)];
  const p95 = timings[Math.floor(iterations * 0.95)];
  
  return { avg: avg.toFixed(2), median: median.toFixed(2), p95: p95.toFixed(2) };
}

async function run() {
  const url = 'http://localhost:8080/api/v1/auth/login';
  
  console.log('Benchmarking Existing User (wrong password)...');
  const existing = await measureP95(url, {email: 'admin@legxi.com', password: 'wrongpassword'}, 100);
  console.log(existing);

  console.log('Benchmarking Missing User...');
  const missing = await measureP95(url, {email: 'missing@legxi.com', password: 'wrongpassword'}, 100);
  console.log(missing);
}

run().catch(console.error);
