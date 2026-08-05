import fs from 'fs';

async function run() {
  for (let i = 0; i < 20; i++) {
    const url = `https://docs.google.com/spreadsheets/d/1A6vK2Sv-7oWCq9Mr8IO6bnEqhONqLC8Xt6HCoF8aAx0/export?format=csv&gid=${i}`;
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('Sign in - Google Accounts') && text.length > 50) {
         console.log(`Found data on gid=${i} (Length: ${text.length})`);
         fs.writeFileSync(`sheet_gid_${i}.csv`, text);
      }
    }
  }
}
run();
