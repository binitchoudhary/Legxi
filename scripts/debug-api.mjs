const res = await fetch('https://api-7zal2ngszq-uc.a.run.app/customer-products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+918368853400', ordersFirst: 100, lineItemsFirst: 50 })
});
const data = await res.json();
const customers = data?.customers?.edges || [];
console.log('HTTP status:', res.status);
console.log('top-level keys:', Object.keys(data));
console.log('customers array length:', customers.length);
if (customers.length > 0) {
  console.log('first customer phone:', customers[0].node.phone);
  console.log('first customer orders:', customers[0].node.orders?.edges?.length);
}
