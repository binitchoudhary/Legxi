import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';

const buf = readFileSync('LEGXI_Category_Payment_Report.csv');
const wbIn = xlsx.read(buf, { type: 'buffer' });
const wsIn = wbIn.Sheets[wbIn.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(wsIn);

let partiallyPaid = [];
let pending = [];

data.forEach(row => {
  let cat = row['Category'] ? row['Category'].toUpperCase() : 'OTHERS';
  if (cat === 'NEEDS REVIEW') cat = 'OTHERS';
  
  if (cat === 'OTHERS') {
    const status = (row['Financial Status'] || '').toUpperCase();
    if (status === 'PARTIALLY_PAID') partiallyPaid.push(row['Order Number']);
    if (status === 'PENDING') pending.push(row['Order Number']);
  }
});

console.log("OTHERS - Partially Paid (" + partiallyPaid.length + "):");
console.log(partiallyPaid.join(', '));

console.log("\nOTHERS - Pending (" + pending.length + "):");
console.log(pending.join(', '));
