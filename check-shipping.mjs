import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function restGet(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  return { status: res.status, data: await res.json() };
}

// Check shipping zones
console.log('=== SHIPPING ZONES ===');
const { data: shippingData } = await restGet('shipping_zones.json');
for (const zone of shippingData.shipping_zones) {
  console.log(`\nZone: ${zone.name} (ID: ${zone.id})`);
  console.log(`Countries: ${zone.countries.map(c => c.name).join(', ')}`);
  if (zone.weight_based_shipping_rates?.length) {
    console.log(`Weight-based rates:`);
    for (const rate of zone.weight_based_shipping_rates) {
      console.log(`  ${rate.name}: ${rate.price} (min: ${rate.weight_min?.value || 0}, max: ${rate.weight_max?.value || 'unlimited'})`);
    }
  }
  if (zone.price_based_shipping_rates?.length) {
    console.log(`Price-based rates:`);
    for (const rate of zone.price_based_shipping_rates) {
      console.log(`  ${rate.name}: ${rate.price} (min: ${rate.min_order_subtotal || 0})`);
    }
  }
  if (!zone.weight_based_shipping_rates?.length && !zone.price_based_shipping_rates?.length) {
    console.log(`  No rates configured`);
  }
}

// Check carrier shipping
console.log('\n=== CARRIER SERVICES ===');
const { data: carrierData } = await restGet('carrier_services.json');
console.log(JSON.stringify(carrierData, null, 2));

// Check inventory items for Trinity Set
console.log('\n=== TRINITY SET PRODUCT CHECK ===');
// Search for Trinity product
const { data: searchData } = await restGet('products.json?title=Trinity+Set+Slot+03');
console.log(JSON.stringify(searchData, null, 2));

// Check if the deleted product still has variants in inventory
console.log('\n=== CHECK INVENTORY LEVELS FOR VARIANT 47930504249518 ===');
const { data: invData } = await restGet('inventory_levels.json?variant_ids=47930504249518');
console.log(JSON.stringify(invData, null, 2));
