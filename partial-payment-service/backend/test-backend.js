
async function test() {
  const payload = {
    idempotencyKey: Date.now().toString(),
    draftOrderId: "gid://shopify/DraftOrder/1066750345472",
    advanceAmount: "500.00",
    currency: "INR",
    paymentMode: "UPI",
    staffNote: "test"
  };
  try {
    const response = await fetch('http://localhost:3000/api/v1/partial-payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', data);
  } catch (err) {
    console.error(err);
  }
}
test();
