const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

async function auditUrl(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    
    // Check for Organization Schema
    const hasOrgSchema = html.includes('"@type": "Organization"');
    const hasLocalBiz = html.includes('"@type": "LocalBusiness"');
    
    // Check for Robots meta
    const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
    const robots = robotsMatch ? robotsMatch[1] : 'None';

    console.log(`\n--- POST-AUDIT: ${url} ---`);
    console.log(`Organization Schema: ${hasOrgSchema ? 'Present' : 'Absent'}`);
    console.log(`LocalBusiness Schema: ${hasLocalBiz ? 'Present' : 'Absent'}`);
    console.log(`Robots Meta: ${robots}`);

  } catch(e) {
    console.log(`Failed to audit ${url}: ${e.message}`);
  }
}

async function main() {
  await auditUrl('https://legxi.co/');
  await auditUrl('https://legxi.co/products/legxi-champions-trinity-set-1');
  await auditUrl('https://legxi.co/pages/career');
}
main();
