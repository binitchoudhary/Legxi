import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('audit-data.json', 'utf8'));
const orders = data.orders;

let draftOrdersCount = 0;
let statuses = { PAID: 0, PARTIALLY_PAID: 0, PENDING: 0, REFUNDED: 0, VOIDED: 0 };
let categories = { 'Heritage Minis': 0, 'MagShield': 0, 'Others': 0 };
let reportLines = [];

orders.forEach(order => {
  // Let's identify draft orders.
  // In Shopify, orders created from draft orders typically have a 'manual' gateway or no transactions at all if pending, or specific tags.
  // We can also check if they are in the user's specific "Draft" tags.
  // The user specifically mentions "#2160 (Created from Draft Orders with advance payment)"
  
  let isDraft = false;
  const tags = order.tags || [];
  
  // order 2160 check
  if (order.name === '#2160') {
    console.log("Order #2160 Tags:", tags);
    console.log("Order #2160 Transactions:", JSON.stringify(order.transactions, null, 2));
    console.log("Order #2160 displayFinancialStatus:", order.displayFinancialStatus);
    console.log("Total Received:", order.totalReceivedSet?.shopMoney?.amount);
    console.log("Total Outstanding:", order.totalOutstandingSet?.shopMoney?.amount);
  }
  
  // How to identify draft orders strictly from the fetched audit-data.json?
  // 1. Transaction gateway = 'manual' or 'custom' or 'Draft Orders' (Shopify logs 'manual' for draft order marked as paid)
  // 2. Tags
  const gateways = order.transactions ? order.transactions.map(t => t.gateway.toLowerCase()) : [];
  
  if (gateways.includes('manual') || tags.includes('Draft') || tags.includes('draft') || gateways.includes('draft orders')) {
    isDraft = true;
  }
  
  if (isDraft) {
    draftOrdersCount++;
    const finStatus = (order.displayFinancialStatus || 'UNKNOWN').toUpperCase();
    if (statuses[finStatus] !== undefined) statuses[finStatus]++;
    
    // Categorization logic (exact same as audit)
    let hasHeritage = false;
    let hasMagShield = false;
    order.lineItems.edges.forEach(le => {
      const title = (le.node.title || '').toLowerCase();
      if (title.includes('heritage mini')) hasHeritage = true;
      else if (title.includes('magshield')) hasMagShield = true;
    });
    let cat = 'Others';
    if (hasHeritage) cat = 'Heritage Minis';
    else if (hasMagShield) cat = 'MagShield';
    
    categories[cat]++;
    
    if (order.name === '#2160' || order.name === '#1641') {
      reportLines.push({
        order: order.name,
        category: cat,
        status: finStatus,
        received: order.totalReceivedSet?.shopMoney?.amount,
        outstanding: order.totalOutstandingSet?.shopMoney?.amount,
        tags: tags.join(', '),
        gateways: gateways.join(', ')
      });
    }
  }
});

console.log("Draft Orders Identified:", draftOrdersCount);
console.log("Statuses:", statuses);
console.log("Categories:", categories);
console.log("Specific Orders Analyzed:", JSON.stringify(reportLines, null, 2));
