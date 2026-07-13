// Test the admin PUT endpoint directly
const HANDLE = 'cert-2007-the-birth-of-india-s-t20-era-010';
const API    = 'https://api-7zal2ngszq-uc.a.run.app';
const TOKEN  = 'legxi-admin-2024';

// First: GET to confirm record loads
const getRes = await fetch(`${API}/admin/transfers/${HANDLE}`, {
  headers: { 'X-Admin-Token': TOKEN }
});
console.log('GET status:', getRes.status);
const getJson = await getRes.json();
console.log('GET response:', JSON.stringify(getJson).slice(0, 300));

// Then: PUT with edit action
const putRes = await fetch(`${API}/admin/transfers/${HANDLE}`, {
  method: 'PUT',
  headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'approve' }),
});
console.log('\nPUT status:', putRes.status);
const putJson = await putRes.json();
console.log('PUT response:', JSON.stringify(putJson).slice(0, 300));
