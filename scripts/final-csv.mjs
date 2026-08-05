import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';

const csvPath = 'c:\\Users\\DELL\\Downloads\\orders_export_1 (2).csv';
const buf = readFileSync(csvPath);
const wb = xlsx.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

let totalRowsProcessed = 0;
let uniqueOrdersFound = new Set();
let excludedOrders = new Set();

let orderMeta = {}; // To store the order-level financial metrics and line item contents

data.forEach(row => {
  totalRowsProcessed++;
  const orderName = row['Name'];
  if (!orderName) return;
  uniqueOrdersFound.add(orderName);
  
  const status = (row['Financial Status'] || '').toLowerCase();
  const cancelledAt = row['Cancelled at'];
  
  if (status === 'refunded' || status === 'voided' || (cancelledAt && String(cancelledAt).trim() !== '')) {
    excludedOrders.add(orderName);
  }
  
  const lineTitle = (row['Lineitem name'] || '').toLowerCase();
  
  let hasHeritage = false;
  let hasMagShield = false;
  
  if (lineTitle.includes('heritage mini') || lineTitle.includes('heritage minis')) {
    hasHeritage = true;
  }
  if (lineTitle.includes('magshield')) {
    hasMagShield = true;
  }
  
  if (!orderMeta[orderName]) {
    orderMeta[orderName] = {
      name: orderName,
      status: status,
      total: parseFloat(row['Total'] || 0),
      outstanding: parseFloat(row['Outstanding Balance'] || 0),
      isExcluded: false,
      hasHeritage: false,
      hasMagShield: false
    };
  }
  
  if (hasHeritage) orderMeta[orderName].hasHeritage = true;
  if (hasMagShield) orderMeta[orderName].hasMagShield = true;
});

// Mark excluded
excludedOrders.forEach(orderName => {
  if (orderMeta[orderName]) orderMeta[orderName].isExcluded = true;
});

let groups = {
  'Heritage Minis': { orders: new Set(), partialPaidRecv: 0, pendingAmount: 0 },
  'MagShield': { orders: new Set(), partialPaidRecv: 0, pendingAmount: 0 },
  'Others': { orders: new Set(), partialPaidRecv: 0, pendingAmount: 0 }
};

Object.values(orderMeta).forEach(meta => {
  if (meta.isExcluded) return;
  
  let assignedGroups = [];
  
  if (meta.hasHeritage) assignedGroups.push('Heritage Minis');
  if (meta.hasMagShield) assignedGroups.push('MagShield');
  if (!meta.hasHeritage && !meta.hasMagShield) assignedGroups.push('Others');
  
  let receivedAmount = 0;
  if (meta.status === 'partially_paid') {
    receivedAmount = meta.total - meta.outstanding;
  }
  
  assignedGroups.forEach(g => {
    groups[g].orders.add(meta.name);
    if (meta.status === 'partially_paid') {
      groups[g].partialPaidRecv += receivedAmount;
    }
    groups[g].pendingAmount += meta.outstanding;
  });
});

console.log("| Product Group | Total Orders | Partial Paid Amount (Received) | Pending Amount |");
console.log("|---|---|---|---|");
['Heritage Minis', 'MagShield', 'Others'].forEach(g => {
  const o = groups[g].orders.size;
  const p = groups[g].partialPaidRecv;
  const pending = groups[g].pendingAmount;
  console.log(`| ${g} | ${o} | ${p} | ${pending} |`);
});

console.log("\n---");
console.log(`- Rows processed: ${totalRowsProcessed}`);
console.log(`- Unique orders found: ${uniqueOrdersFound.size}`);
console.log(`- Orders excluded (Cancelled, Refunded, Voided): ${excludedOrders.size}`);
