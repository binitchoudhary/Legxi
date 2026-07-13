import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN };
const phone = process.argv[2] || '+918368853400';

const s = await fetch(BASE + `/customers/search.json?query=phone:${encodeURIComponent(phone)}&fields=id,first_name,phone&limit=10`, { headers: H });
const sc = await s.json();
console.log('REST customers found:', sc.customers?.length || 0);

for (const c of (sc.customers || [])) {
  console.log(`\nCustomer: ${c.first_name} | phone: ${c.phone} | id: ${c.id}`);
  const o = await fetch(BASE + `/customers/${c.id}/orders.json?status=any&limit=20&fields=id,name,note,line_items`, { headers: H });
  const od = await o.json();
  for (const order of (od.orders || [])) {
    console.log(`\n  Order: ${order.name} | Note: ${JSON.stringify(order.note)}`);
    for (const li of (order.line_items || [])) {
      console.log(`    Item: "${li.title}" | variant: "${li.variant_title}" | sku: "${li.sku}"`);
      if (li.properties?.length) console.log(`    props:`, JSON.stringify(li.properties));
    }
  }
}
