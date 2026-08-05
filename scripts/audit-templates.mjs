import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';
const themeDir = 'C:\\\\Users\\\\DELL\\\\Desktop\\\\legxi\\\\theme\\\\templates';

async function run() {
  console.log("Starting Template Audit...");
  
  // 1. Read the drafted descriptions
  const draftFile = path.join(artifactsDir, 'SEO_DESCRIPTION_DRAFTS.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(draftFile);
  const ws = wb.getWorksheet('SEO Drafts');
  
  const drafts = {};
  ws.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const handle = row.getCell(1).value;
      const proposedDesc = row.getCell(5).value;
      drafts[handle] = proposedDesc;
    }
  });

  // 2. Audit JSON templates
  const files = fs.readdirSync(themeDir).filter(f => f.startsWith('product.') && f.endsWith('.json'));
  
  const mapWb = new ExcelJS.Workbook();
  const mapWs = mapWb.addWorksheet('Template Descriptions');
  
  mapWs.columns = [
    { header: 'Product Handle', key: 'handle', width: 40 },
    { header: 'Template Name', key: 'template', width: 40 },
    { header: 'Accordion Block ID', key: 'blockId', width: 25 },
    { header: 'Current Content', key: 'current', width: 100 },
    { header: 'Proposed Content', key: 'proposed', width: 100 }
  ];

  let foundCount = 0;

  for (const file of files) {
    const templateSuffix = file.replace('product.', '').replace('.json', '');
    if (templateSuffix === '') continue; // Skip default product.json
    
    // We assume the handle matches the template suffix exactly for these highly customized products.
    // If not, we still record the template's description block.
    const handle = templateSuffix;
    const proposedDesc = drafts[handle] || "No SEO draft available";

    const content = fs.readFileSync(path.join(themeDir, file), 'utf8');
    let json;
    try {
      json = JSON.parse(content);
    } catch(e) {
      console.error(`Failed to parse ${file}`);
      continue;
    }
    
    // Traverse blocks to find type: "accordion" with title "Description"
    let descriptionBlockId = null;
    let currentContent = null;
    
    if (json.sections && json.sections.main && json.sections.main.blocks) {
      const blocks = json.sections.main.blocks;
      for (const [blockId, blockData] of Object.entries(blocks)) {
        if (blockData.type === 'accordion' && blockData.settings && blockData.settings.title && blockData.settings.title.toLowerCase().includes('description')) {
          descriptionBlockId = blockId;
          currentContent = blockData.settings.content || '';
          break;
        }
      }
    }
    
    if (descriptionBlockId) {
      mapWs.addRow({
        handle,
        template: file,
        blockId: descriptionBlockId,
        current: currentContent,
        proposed: proposedDesc
      });
      foundCount++;
    }
  }

  const outPath = path.join(artifactsDir, 'CUSTOM_TEMPLATE_DESCRIPTION_MAP.xlsx');
  await mapWb.xlsx.writeFile(outPath);
  console.log(`Audit complete. Found ${foundCount} custom templates with hardcoded descriptions.`);
  console.log(`Exported to ${outPath}`);
}

run().catch(console.error);
