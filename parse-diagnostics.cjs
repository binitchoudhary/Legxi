const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\dell\\Downloads\\product_issues_2026-07-06_18-07-43.csv', 'utf8');
const lines = data.split('\n');
const headers = lines[0].split(',');

const issues = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Basic CSV parsing handling quotes
  let cols = [];
  let current = '';
  let inQuotes = false;
  for(let char of line) {
    if(char === '"') inQuotes = !inQuotes;
    else if(char === ',' && !inQuotes) { cols.push(current); current = ''; }
    else current += char;
  }
  cols.push(current);
  
  const itemId = cols[0];
  const title = cols[1];
  const issueTitle = cols[7];
  const issueMsg = cols[8];
  
  if (!issueTitle) continue;

  if (!issues[issueTitle]) {
    issues[issueTitle] = {
      message: issueMsg,
      products: new Set()
    };
  }
  issues[issueTitle].products.add(title + " (" + itemId + ")");
}

for (const [issueTitle, data] of Object.entries(issues)) {
  console.log(`\n=== ${issueTitle} ===`);
  console.log(`Message: ${data.message}`);
  console.log(`Unique Products Affected: ${data.products.size}`);
  
  let count = 0;
  for (const p of data.products) {
    if (count < 5) console.log(` - ${p}`);
    count++;
  }
  if (data.products.size > 5) console.log(`   ...and ${data.products.size - 5} more`);
}
