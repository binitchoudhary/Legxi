import 'dotenv/config';

const res = await fetch('https://legxi.co/collections/legxi-football-collection');
const html = await res.text();

// Find the shopify-section div for featured_collections_AgTWrj
const sectionDivIdx = html.indexOf('id="shopify-section-template--21124450943150__featured_collections_AgTWrj"');
if (sectionDivIdx === -1) { console.log('Section div NOT found'); process.exit(1); }
console.log('Section found at index:', sectionDivIdx);

// Get the 3000 chars starting from the section (includes the style block inside)
const sectionChunk = html.substring(sectionDivIdx, sectionDivIdx + 3000);
console.log('\n=== SECTION HTML START ===');
console.log(sectionChunk);
