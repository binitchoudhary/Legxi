import fs from 'fs';

const riskData = JSON.parse(fs.readFileSync('phase5-risk-report.json', 'utf8'));

// 29 orders total
const manualReviewOrders = [
  { order: '1244', cust: 'CHIDAMBARA M', val: '#555', evidence: 'Value > 500' },
  { order: '1276', cust: 'Nishant Ramani', val: '#600', evidence: 'Value > 500' },
  { order: '1339', cust: 'Sachin Bhatia', val: '#2010', evidence: 'Value > 500' },
  { order: '1350', cust: 'Amit Mohite', val: '#1983', evidence: 'Value > 500' },
  { order: '1401', cust: 'Aasit Vinaykant', val: '#007', evidence: 'Duplicate in note' }
];

const allBundleRisks = riskData.risks.filter(r => r.category === 'BUNDLE_PENDING');
const bundleOrders = allBundleRisks.filter(r => r.orderNum !== '1498');

const rows = [];

// 1. Critical: #1504
rows.push({
  Priority: 'Critical', OrderNumber: '1504', Customer: 'SHREYASKUMAR Chaudhari',
  IssueType: 'Missing worksheet rows', CurrentValue: 'Missing', ExpectedValue: '#932, #938',
  RequiredAction: 'Add 2 rows to 2011 WORLD CUP worksheet', CanAutoFix: 'No', Status: 'Unresolved',
  Evidence: 'Shopify note lists certificates missing from sheet'
});

// 2. High: #1498
rows.push({
  Priority: 'High', OrderNumber: '1498', Customer: 'Akshay Kumar',
  IssueType: 'Typo normalization', CurrentValue: 'NAMDE', ExpectedValue: 'NAMDU',
  RequiredAction: 'Approve typo normalization', CanAutoFix: 'Yes', Status: 'Unresolved',
  Evidence: 'Shopify line item is misspelled'
});

// 3. High: Manual Review (5)
manualReviewOrders.forEach(m => {
  rows.push({
    Priority: 'High', OrderNumber: m.order, Customer: m.cust,
    IssueType: 'Manual review', CurrentValue: m.val, ExpectedValue: 'Valid Serial < 500',
    RequiredAction: 'Human verification of note value', CanAutoFix: 'No', Status: 'Unresolved',
    Evidence: m.evidence
  });
});

// 4. Medium: Legacy cleanup (2)
rows.push({
  Priority: 'Medium', OrderNumber: '1496', Customer: 'Krishna Desai',
  IssueType: 'Legacy cleanup', CurrentValue: '1983 WC : Become the Belief|#062', ExpectedValue: '(Remove)',
  RequiredAction: 'Set APPROVE_LEGACY_REMOVE = true', CanAutoFix: 'Yes', Status: 'Unresolved',
  Evidence: 'Legacy format preserved by safety checks'
});
rows.push({
  Priority: 'Medium', OrderNumber: '1508', Customer: 'SHREYASKUMAR Chaudhari',
  IssueType: 'Legacy cleanup', CurrentValue: '1983 WC : Become the Belief|#069', ExpectedValue: '(Remove)',
  RequiredAction: 'Set APPROVE_LEGACY_REMOVE = true', CanAutoFix: 'Yes', Status: 'Unresolved',
  Evidence: 'Legacy format preserved by safety checks'
});

// 5. Low: Bundle policy (21)
bundleOrders.forEach(b => {
  rows.push({
    Priority: 'Low', OrderNumber: b.orderNum, Customer: b.customer,
    IssueType: 'Bundle policy', CurrentValue: 'Unwritten', ExpectedValue: 'Component lines appended',
    RequiredAction: 'Set WRITE_BUNDLE_COMPONENTS = true', CanAutoFix: 'Yes', Status: 'Unresolved',
    Evidence: b.finding
  });
});

// Calculate stats
let critical = 0, high = 0, medium = 0, low = 0;
let autoFix = 0, manual = 0;
rows.forEach(r => {
  if(r.Priority === 'Critical') critical++;
  if(r.Priority === 'High') high++;
  if(r.Priority === 'Medium') medium++;
  if(r.Priority === 'Low') low++;
  if(r.CanAutoFix === 'Yes') autoFix++;
  if(r.CanAutoFix === 'No') manual++;
});
const total = rows.length;
const compPct = 0; 

// Generate HTML
let html = `<html>
<head>
<style>
  body { font-family: sans-serif; padding: 20px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f2f2f2; }
  .p-Critical { background-color: #ffcccc; color: #990000; font-weight: bold; }
  .p-High { background-color: #ffe5cc; color: #b35900; font-weight: bold; }
  .p-Medium { background-color: #ffffcc; color: #999900; font-weight: bold; }
  .p-Low { background-color: #cce5ff; color: #004c99; font-weight: bold; }
  .dashboard { display: flex; gap: 20px; }
  .card { border: 1px solid #ccc; padding: 15px; border-radius: 5px; background: #fafafa; min-width: 150px; }
  h1, h2 { color: #333; }
</style>
</head>
<body>
<h1>Order Notes Exception Report</h1>
<table>
  <tr>
    <th>Priority</th><th>Order Number</th><th>Customer</th><th>Issue Type</th>
    <th>Current Value</th><th>Expected Value</th><th>Required Action</th>
    <th>Can Auto Fix (Yes/No)</th><th>Status</th><th>Evidence</th>
  </tr>`;

rows.forEach(r => {
  html += `
  <tr class="p-${r.Priority}">
    <td>${r.Priority}</td>
    <td>${r.OrderNumber}</td>
    <td>${r.Customer}</td>
    <td>${r.IssueType}</td>
    <td>${r.CurrentValue}</td>
    <td>${r.ExpectedValue}</td>
    <td>${r.RequiredAction}</td>
    <td>${r.CanAutoFix}</td>
    <td>${r.Status}</td>
    <td>${r.Evidence}</td>
  </tr>`;
});

html += `
</table>
<h2>Dashboard</h2>
<div class="dashboard">
  <div class="card"><h3>Total Issues</h3><h2>${total}</h2></div>
  <div class="card p-Critical"><h3>Critical</h3><h2>${critical}</h2></div>
  <div class="card p-High"><h3>High</h3><h2>${high}</h2></div>
  <div class="card p-Medium"><h3>Medium</h3><h2>${medium}</h2></div>
  <div class="card p-Low"><h3>Low</h3><h2>${low}</h2></div>
</div>
<div class="dashboard" style="margin-top:20px;">
  <div class="card"><h3>Auto Fixable</h3><h2>${autoFix}</h2></div>
  <div class="card"><h3>Manual Only</h3><h2>${manual}</h2></div>
  <div class="card"><h3>Issue Completion</h3><h2>${compPct}%</h2></div>
</div>
</body>
</html>`;

fs.writeFileSync('Order Notes Exception Report.html', html);

// Generate CSV
const csvHeader = 'Priority,Order Number,Customer,Issue Type,Current Value,Expected Value,Required Action,Can Auto Fix (Yes/No),Status,Evidence\n';
const csvRows = rows.map(r => 
  [r.Priority, r.OrderNumber, `"${r.Customer}"`, r.IssueType, `"${r.CurrentValue}"`, `"${r.ExpectedValue}"`, `"${r.RequiredAction}"`, r.CanAutoFix, r.Status, `"${r.Evidence}"`].join(',')
).join('\n');

const csvDashboard = `
\nDashboard
Total Issues,${total}
Critical,${critical}
High,${high}
Medium,${medium}
Low,${low}
Auto Fixable,${autoFix}
Manual Only,${manual}
Completion Percentage,${compPct}%
`;

fs.writeFileSync('Order Notes Exception Report.csv', csvHeader + csvRows + csvDashboard);

console.log('Successfully generated Order Notes Exception Report (.csv and .html)');
