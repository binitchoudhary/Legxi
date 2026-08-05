import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    bidding_storm: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 }, // Ramp up to 500 VUs
        { duration: '1m', target: 500 },  // Sustained load
        { duration: '10s', target: 1000 }, // Sniping spike
        { duration: '30s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '10s',
    },
    auction_closure: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 200,
      maxDuration: '1m',
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests must complete below 200ms
    errors: ['rate<0.01'], // Error rate must be less than 1% (accounting for expected OCC retries maxing out in extreme cases)
  },
};

const API_BASE = 'http://localhost:3000/api/v1';
const AUCTION_ID = 'benchmark-auction-1';

export default function () {
  // Scenario 1: High concurrency bidding
  const payload = JSON.stringify({
    userId: `user-${__VU}-${__ITER}`,
    amountPaise: Math.floor(Math.random() * 1000) + 1000,
    isProxy: false
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': `k6-req-${__VU}-${__ITER}`
    },
  };

  const res = http.post(`${API_BASE}/auctions/${AUCTION_ID}/bids`, payload, params);
  
  const success = check(res, {
    'status is 200 or 409 (OCC conflict expected under heavy load)': (r) => r.status === 200 || r.status === 409,
  });

  errorRate.add(!success);
  
  sleep(Math.random() * 2); // Random sleep between 0-2s to simulate real users
}
