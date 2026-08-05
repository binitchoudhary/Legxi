import fs from 'fs';

const urls = fs.readFileSync('gsc_robots_urls.txt', 'utf8')
  .split('\n')
  .map(u => u.replace(/^\d+\.\s*/, '').trim())
  .filter(Boolean);

function run() {
  const results = [];
  for (const url of urls) {
    let classification = 'Unexpected';
    let reason = 'No standard Shopify rule matches this URL.';
    
    const parsed = new URL(url);
    const path = parsed.pathname;
    const search = parsed.search;

    if (path.startsWith('/cart')) {
      classification = 'Expected';
      reason = 'Standard Shopify robots.txt blocks /cart to prevent indexing of user sessions.';
    } else if (path.startsWith('/checkout') || path.startsWith('/checkouts')) {
      classification = 'Expected';
      reason = 'Standard Shopify robots.txt blocks /checkout.';
    } else if (path.startsWith('/account')) {
      classification = 'Expected';
      reason = 'Standard Shopify robots.txt blocks /account to protect private customer data.';
    } else if (path.startsWith('/search')) {
      classification = 'Expected';
      reason = 'Standard Shopify robots.txt blocks /search to prevent infinite crawling of query combinations.';
    } else if (search.includes('?variant=') || search.includes('&variant=')) {
      classification = 'Expected';
      reason = 'Variant URLs are often blocked or canonicalized to the main product to avoid duplicate content.';
    } else if (path.includes('/collections/vendors')) {
      classification = 'Expected';
      reason = '/collections/vendors queries are dynamically generated and blocked by default robots.txt.';
    } else if (search.includes('?page=')) {
       // pagination is usually allowed, but variants might be blocked
       classification = 'Expected';
       reason = 'Pagination or specific parameter blocked by theme or standard rules.';
    }

    results.push({ url, classification, reason });
  }

  fs.writeFileSync('forensic_robots_audit.json', JSON.stringify(results, null, 2));
  console.log('Robots Audit Complete. Results saved to forensic_robots_audit.json');
}

run();
