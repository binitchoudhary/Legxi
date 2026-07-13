import 'dotenv/config';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const varIds = [
  "47970894053550",
  "47970894119086",
  "47975040647342",
  "47930504249518",
  "47970894151854",
  "47970894250158",
  "47970894315694",
  "47970894381230",
  "47970894413998",
  "47975040319662"
];

async function run() {
  for (let varId of varIds) {
    const query = `query { productVariant(id: "gid://shopify/ProductVariant/${varId}") { title price compareAtPrice product { title handle } } }`;
    const res = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/graphql.json`, { method: 'POST', headers: H, body: JSON.stringify({ query }) });
    const json = await res.json();
    if (json.data && json.data.productVariant) {
       const v = json.data.productVariant;
       console.log(`- ${v.product.title} / ${v.title} | Price: ${v.price} | CompareAt: ${v.compareAtPrice}`);
    } else {
       console.log(`Failed varId ${varId}:`, json.errors || json);
    }
  }
}
run();
