import fs from 'fs';
import ExcelJS from 'exceljs';

async function generate() {
  const riskData = JSON.parse(fs.readFileSync('phase5-risk-report.json', 'utf8'));

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

  rows.push({
    Priority: 'Critical', OrderNumber: 1504, Customer: 'SHREYASKUMAR Chaudhari',
    IssueType: 'Missing worksheet rows', CurrentValue: 'Missing', ExpectedValue: '#932, #938',
    RequiredAction: 'Add 2 rows to 2011 WORLD CUP worksheet', CanAutoFix: 'No', Status: 'Unresolved',
    Evidence: 'Shopify note lists certificates missing from sheet'
  });

  rows.push({
    Priority: 'High', OrderNumber: 1498, Customer: 'Akshay Kumar',
    IssueType: 'Typo normalization', CurrentValue: 'NAMDE', ExpectedValue: 'NAMDU',
    RequiredAction: 'Approve typo normalization', CanAutoFix: 'Yes', Status: 'Unresolved',
    Evidence: 'Shopify line item is misspelled'
  });

  manualReviewOrders.forEach(m => {
    rows.push({
      Priority: 'High', OrderNumber: parseInt(m.order), Customer: m.cust,
      IssueType: 'Manual review', CurrentValue: m.val, ExpectedValue: 'Valid Serial < 500',
      RequiredAction: 'Human verification of note value', CanAutoFix: 'No', Status: 'Unresolved',
      Evidence: m.evidence
    });
  });

  rows.push({
    Priority: 'Medium', OrderNumber: 1496, Customer: 'Krishna Desai',
    IssueType: 'Legacy cleanup', CurrentValue: '1983 WC : Become the Belief|#062', ExpectedValue: '(Remove)',
    RequiredAction: 'Set APPROVE_LEGACY_REMOVE = true', CanAutoFix: 'Yes', Status: 'Unresolved',
    Evidence: 'Legacy format preserved by safety checks'
  });
  rows.push({
    Priority: 'Medium', OrderNumber: 1508, Customer: 'SHREYASKUMAR Chaudhari',
    IssueType: 'Legacy cleanup', CurrentValue: '1983 WC : Become the Belief|#069', ExpectedValue: '(Remove)',
    RequiredAction: 'Set APPROVE_LEGACY_REMOVE = true', CanAutoFix: 'Yes', Status: 'Unresolved',
    Evidence: 'Legacy format preserved by safety checks'
  });

  bundleOrders.forEach(b => {
    rows.push({
      Priority: 'Low', OrderNumber: parseInt(b.orderNum), Customer: b.customer,
      IssueType: 'Bundle policy', CurrentValue: 'Unwritten', ExpectedValue: 'Component lines appended',
      RequiredAction: 'Set WRITE_BUNDLE_COMPONENTS = true', CanAutoFix: 'Yes', Status: 'Unresolved',
      Evidence: b.finding
    });
  });

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
  const compPct = '0%';

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Exception Report');

  // Columns setup
  sheet.columns = [
    { header: 'Priority', key: 'Priority', width: 12 },
    { header: 'Order Number', key: 'OrderNumber', width: 15 },
    { header: 'Customer', key: 'Customer', width: 25 },
    { header: 'Issue Type', key: 'IssueType', width: 25 },
    { header: 'Current Value', key: 'CurrentValue', width: 35 },
    { header: 'Expected Value', key: 'ExpectedValue', width: 25 },
    { header: 'Required Action', key: 'RequiredAction', width: 35 },
    { header: 'Can Auto Fix', key: 'CanAutoFix', width: 15 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'Evidence', key: 'Evidence', width: 45 }
  ];

  // Header styling
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };

  // Add rows and color cells
  rows.forEach(item => {
    const row = sheet.addRow(item);
    
    // Apply background colors to the Priority cell
    const cell = row.getCell(1);
    cell.font = { bold: true };
    if (item.Priority === 'Critical') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }; // Red
      cell.font = { color: { argb: 'FF990000' }, bold: true };
    } else if (item.Priority === 'High') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE5CC' } }; // Orange
      cell.font = { color: { argb: 'FFB35900' }, bold: true };
    } else if (item.Priority === 'Medium') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } }; // Yellow
      cell.font = { color: { argb: 'FF999900' }, bold: true };
    } else if (item.Priority === 'Low') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' } }; // Blue
      cell.font = { color: { argb: 'FF004C99' }, bold: true };
    }
  });

  // Add Dashboard at the bottom
  sheet.addRow([]);
  sheet.addRow([]);
  
  const dbHeader = sheet.addRow(['Dashboard']);
  dbHeader.font = { bold: true, size: 14 };

  const dbData = [
    ['Total Issues', total],
    ['Critical', critical],
    ['High', high],
    ['Medium', medium],
    ['Low', low],
    ['Auto Fixable', autoFix],
    ['Manual Only', manual],
    ['Completion Percentage', compPct]
  ];

  dbData.forEach(d => {
    const r = sheet.addRow(d);
    r.getCell(1).font = { bold: true };
  });

  await workbook.xlsx.writeFile('Order Notes Exception Report.xlsx');
  console.log('Successfully created Order Notes Exception Report.xlsx');
}

generate().catch(console.error);
