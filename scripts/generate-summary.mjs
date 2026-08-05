import { readFileSync, writeFileSync } from 'fs';
import * as xlsx from 'xlsx';

const csvData = readFileSync('LEGXI_Category_Payment_Report.csv', 'utf-8');
const rows = csvData.trim().split('\n').slice(1);

const createMetrics = () => ({
  TotalOrders: 0,
  FullyPaid: 0,
  PartiallyPaid: 0,
  Pending: 0,
  Refunded: 0,
  Voided: 0,
  TotalValue: 0,
  TotalReceived: 0,
  TotalOutstanding: 0,
  TotalRefunded: 0
});

let metrics = {
  'HERITAGE MINIS': createMetrics(),
  'MAGSHIELD': createMetrics(),
  'OTHERS': createMetrics()
};

rows.forEach(row => {
  // Regex to handle quoted CSV fields correctly
  const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!matches) {
     // fallback split
     const cols = row.split(',');
     if(cols.length < 12) return;
  }
  
  // A simpler way: since we only need certain columns, let's just parse it using basic split or better yet use xlsx to parse the CSV!
});

const buf = readFileSync('LEGXI_Category_Payment_Report.csv');
const wbIn = xlsx.read(buf, { type: 'buffer' });
const wsIn = wbIn.Sheets[wbIn.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(wsIn);

data.forEach(row => {
  let cat = row['Category'] ? row['Category'].toUpperCase() : 'OTHERS';
  if (cat === 'NEEDS REVIEW') cat = 'OTHERS';
  
  if (!metrics[cat]) cat = 'OTHERS';

  const m = metrics[cat];
  m.TotalOrders++;
  
  const status = (row['Financial Status'] || '').toUpperCase();
  if (status === 'PAID') m.FullyPaid++;
  if (status === 'PARTIALLY_PAID') m.PartiallyPaid++;
  if (status === 'PENDING') m.Pending++;
  if (status === 'REFUNDED') m.Refunded++;
  if (status === 'VOIDED') m.Voided++;

  m.TotalValue += parseFloat(row['Order Total'] || 0);
  m.TotalReceived += parseFloat(row['Amount Received'] || 0);
  m.TotalOutstanding += parseFloat(row['Outstanding Amount'] || 0);
  m.TotalRefunded += parseFloat(row['Refunded Amount'] || 0);
});

let grandTotal = createMetrics();
for (const cat in metrics) {
  grandTotal.TotalOrders += metrics[cat].TotalOrders;
  grandTotal.FullyPaid += metrics[cat].FullyPaid;
  grandTotal.PartiallyPaid += metrics[cat].PartiallyPaid;
  grandTotal.Pending += metrics[cat].Pending;
  grandTotal.Refunded += metrics[cat].Refunded;
  grandTotal.Voided += metrics[cat].Voided;
  grandTotal.TotalValue += metrics[cat].TotalValue;
  grandTotal.TotalReceived += metrics[cat].TotalReceived;
  grandTotal.TotalOutstanding += metrics[cat].TotalOutstanding;
  grandTotal.TotalRefunded += metrics[cat].TotalRefunded;
}

let summaryData = [];

function pushCategory(title, m) {
  summaryData.push([title]);
  summaryData.push(['- Total Orders', m.TotalOrders]);
  summaryData.push(['- Fully Paid Orders', m.FullyPaid]);
  summaryData.push(['- Partially Paid Orders', m.PartiallyPaid]);
  summaryData.push(['- Pending Orders', m.Pending]);
  summaryData.push(['- Refunded Orders', m.Refunded]);
  if (title === 'HERITAGE MINIS' || title === 'MAGSHIELD' || title === 'OTHERS' || title === 'GRAND TOTAL') {
     // User specifically requested Voided Orders only if we have them? Wait, user requested:
     // - Total Orders
     // - Fully Paid Orders
     // - Partially Paid Orders
     // - Pending Orders
     // - Refunded Orders
     // - Total Order Value
     // - Total Amount Received
     // - Total Outstanding Amount
     // The prompt does NOT ask for "Voided Orders" or "Total Refunded Amount" in the summary! Let's follow EXACTLY what was requested.
  }
}

let strictSummaryData = [];
function pushStrictCategory(title, m) {
  strictSummaryData.push(['========================================']);
  strictSummaryData.push([]);
  strictSummaryData.push([title]);
  strictSummaryData.push([]);
  strictSummaryData.push(['- Total Orders', m.TotalOrders]);
  strictSummaryData.push(['- Fully Paid Orders', m.FullyPaid]);
  strictSummaryData.push(['- Partially Paid Orders', m.PartiallyPaid]);
  strictSummaryData.push(['- Pending Orders', m.Pending]);
  strictSummaryData.push(['- Refunded Orders', m.Refunded]);
  strictSummaryData.push(['- Total Order Value', m.TotalValue]);
  strictSummaryData.push(['- Total Amount Received', m.TotalReceived]);
  strictSummaryData.push(['- Total Outstanding Amount', m.TotalOutstanding]);
  strictSummaryData.push([]);
}

pushStrictCategory('HERITAGE MINIS', metrics['HERITAGE MINIS']);
pushStrictCategory('MAGSHIELD', metrics['MAGSHIELD']);
pushStrictCategory('OTHERS', metrics['OTHERS']);
pushStrictCategory('GRAND TOTAL', grandTotal);
strictSummaryData.push(['========================================']);

const wbOut = xlsx.utils.book_new();
const wsOut = xlsx.utils.aoa_to_sheet(strictSummaryData);
xlsx.utils.book_append_sheet(wbOut, wsOut, 'Payment Summary');

writeFileSync('LEGXI_Payment_Summary.xlsx', xlsx.write(wbOut, { type: 'buffer', bookType: 'xlsx' }));
writeFileSync('LEGXI_Payment_Summary.csv', xlsx.utils.sheet_to_csv(wsOut));

console.log('Successfully generated LEGXI_Payment_Summary.xlsx and LEGXI_Payment_Summary.csv');
