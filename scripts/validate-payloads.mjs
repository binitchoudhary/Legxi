import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';

function decodeHtmlEntities(str) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–'
  };
  return str.replace(/&[#\\w]+;/g, match => entities[match] || match);
}

function sanitizeSeoField(inputStr, maxLen) {
  if (!inputStr) return { result: null, stripped: false, truncated: false };
  let stripped = false;
  let truncated = false;
  
  // 1. Strip HTML
  let cleanStr = inputStr;
  if (/<[^>]+>/.test(cleanStr)) {
    cleanStr = cleanStr.replace(/<[^>]+>/g, '');
    stripped = true;
  }
  
  // 2. Decode entities
  cleanStr = decodeHtmlEntities(cleanStr);
  
  // 3. Normalize whitespace
  cleanStr = cleanStr.replace(/\\s+/g, ' ').trim();
  
  // 4. Truncate
  if (cleanStr.length > maxLen) {
    cleanStr = cleanStr.substring(0, maxLen).trim();
    truncated = true;
  }
  
  return { result: cleanStr, stripped, truncated };
}

async function run() {
  console.log("Starting Pre-Deployment Validation...");

  const draftFile = path.join(artifactsDir, 'SEO_DESCRIPTION_DRAFTS_REBUILT.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(draftFile);
  const ws = wb.getWorksheet('SEO Drafts Rebuilt');
  
  let totalProducts = 0;
  let validPayloads = 0;
  let invalidPayloads = 0;
  let htmlStrippedCount = 0;
  let truncatedCount = 0;
  let productsSkipped = 0;
  
  let reportDetails = "";

  ws.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      totalProducts++;
      const handle = row.getCell(3).text || row.getCell(3).value;
      const propTitle = row.getCell(7).text || row.getCell(7).value;
      const propDesc = row.getCell(8).text || row.getCell(8).value;
      
      if (!propTitle && !propDesc) {
        productsSkipped++;
        return;
      }
      
      let rejectReason = null;
      let pTitle = sanitizeSeoField(propTitle, 70);
      let pDesc = sanitizeSeoField(propDesc, 160); // Optimal snippet length

      if (pTitle.stripped || pDesc.stripped) htmlStrippedCount++;
      if (pTitle.truncated || pDesc.truncated) truncatedCount++;
      
      if (pDesc.result && pDesc.result.length === 0) {
        rejectReason = "Description became empty after sanitization";
      }

      if (rejectReason) {
        invalidPayloads++;
        reportDetails += `- ❌ **${handle}**: Rejected (${rejectReason})\n`;
      } else {
        validPayloads++;
        reportDetails += `- ✅ **${handle}**: Passed\n`;
        if (pDesc.truncated) {
           reportDetails += `  - *Truncated to 160 chars*: ${pDesc.result.substring(0, 50)}...\n`;
        }
      }
    }
  });

  const isReady = (invalidPayloads === 0 && validPayloads > 0) ? "YES" : "NO";

  const report = `# Pre-Deployment Validation Report

## Payload Sanitization Rules Applied
- **HTML Stripping**: Removed all tags.
- **Entity Decoding**: Converted amp, 39, etc. to native characters.
- **Whitespace Normalization**: Removed duplicate spaces and newlines.
- **Length Enforcement**: 
  - SEO Title: 70 chars max
  - SEO Description: 160 chars max (Optimal Snippet Length)

## Validation Statistics
- **Total Products Checked**: ${totalProducts}
- **Valid Payloads Prepared**: ${validPayloads}
- **Invalid/Rejected Payloads**: ${invalidPayloads}
- **Products Skipped** (No drafted SEO): ${productsSkipped}
- **HTML Tags Stripped From**: ${htmlStrippedCount} fields
- **Strings Truncated**: ${truncatedCount} fields

## Ready for Batch Rollout: ${isReady}

### Payload Details
${reportDetails}
`;

  fs.writeFileSync(path.join(artifactsDir, 'PRE_DEPLOYMENT_VALIDATION_REPORT.md'), report);
  console.log("Validation Complete!");
}

run().catch(console.error);
