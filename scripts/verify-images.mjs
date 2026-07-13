// Verify that the live API now returns images and descriptions
const res = await fetch('https://api-7zal2ngszq-uc.a.run.app/customer-products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+918368853400', ordersFirst: 20, lineItemsFirst: 20 })
});
const data = await res.json();
const orders = data?.customers?.edges?.[0]?.node?.orders?.edges || [];

for (const oe of orders) {
  const o = oe.node;
  if (o.cancelledAt) continue;
  for (const le of (o.lineItems?.edges || [])) {
    const li = le.node;
    const prod = li.product || li.variant?.product;
    if (!prod?.metafield) continue;
    console.log(`\n"${li.title}"`);
    console.log(`  image:       ${prod.images?.edges?.[0]?.node?.url ? '✓ ' + prod.images.edges[0].node.url.slice(0,60) + '...' : '✗ MISSING'}`);
    console.log(`  description: ${prod.description ? '✓ ' + prod.description.slice(0,60) + '...' : '✗ MISSING'}`);
    console.log(`  processedAt: ${o.processedAt || o.createdAt}`);
  }
}
