import jwt from 'jsonwebtoken';

const store = 'sleepycat-customfilter.myshopify.com';
const key = 'dummy_api_key';
const secret = 'dummy_api_secret';

const token = jwt.sign(
  {
    dest: `https://${store}`,
    sub: 'mock-user-123',
    jti: 'mock-jti-456'
  },
  secret,
  {
    algorithm: 'HS256',
    audience: key,
    issuer: `https://${store}/admin`,
    expiresIn: '5m'
  }
);

console.log('Running Invalid Token Test...');
const resBad = await fetch('http://localhost:3000/api/v1/partial-payment/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer invalid_token_xyz`
  }
});
console.log('Invalid Token Status:', resBad.status);
console.log('Invalid Token Response:', await resBad.text());

console.log('\nRunning Valid Token Test...');
const resGood = await fetch('http://localhost:3000/api/v1/partial-payment/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    idempotencyKey: 'test-auth-123',
    draftOrderId: 'gid://shopify/DraftOrder/1234567890',
    advanceAmount: '1',
    currency: 'INR',
    paymentMode: 'Cash'
  })
});

console.log('Valid Token Status:', resGood.status);
console.log('Valid Token Response:', await resGood.text());
