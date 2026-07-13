const res = await fetch('https://api-7zal2ngszq-uc.a.run.app/get-certs-by-phone', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+918368853400' }),
});

const json = await res.json();
const certs = Array.isArray(json) ? json : (json.certs || json.certificates || []);
console.log('HTTP status:', res.status);
console.log('Total certs:', certs.length);
if (!certs.length) {
  console.log('Raw response:', JSON.stringify(json).slice(0, 500));
} else {
  for (const c of certs) {
    console.log(`  [${c._source}] edition_type=${c.edition_type || 'EMPTY'} | ${c.product_title} | #${c.certificate_id}`);
  }
}
