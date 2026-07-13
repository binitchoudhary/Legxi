/**
 * phase6-sync.mjs
 * PHASE 6: Production Order Note Synchronization
 * 
 * EXECUTES writes to Shopify strictly based on Phase 4 simulations.
 * Incorporates Fail-Fast verification, strict merge-based updates,
 * and handles new live lines defensively.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import https from 'https';

// ============================================================================
// CONFIGURATION
// ============================================================================
const BATCH_SIZE = 0; // Default to 1 for maximum safety
const DRY_RUN = false; // Set to false to actually write to Shopify
const WRITE_BUNDLE_COMPONENTS = false; // Set to true to write bundle sub-components
const APPROVE_LEGACY_REMOVE = false; // If false, legacy lines are kept even if replaced

// ============================================================================
// INITIALIZATION
// ============================================================================
const env = readFileSync('.env', 'utf8');
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)`, 'm'))?.[1]?.trim() ?? '';
const STORE   = getEnv('SHOPIFY_STORE');
const TOKEN   = getEnv('SHOPIFY_ADMIN_TOKEN');
const VERSION = getEnv('SHOPIFY_API_VERSION');

const riskReport = JSON.parse(readFileSync('phase5-risk-report.json', 'utf8'));
const phase4Sim = JSON.parse(readFileSync('phase4-simulation.json', 'utf8'));

const logFile = 'phase6-execution.log';
const backupsDir = 'backups';

// Ensure log file has a header if it doesn't exist
if (!existsSync(logFile)) {
  writeFileSync(logFile, '[\n');
}
if (!existsSync(backupsDir)) {
  mkdirSync(backupsDir, { recursive: true });
}

// ============================================================================
// UTILITIES
// ============================================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));
const normQ = s => s.replace(/[''‚‛]/g, "'").replace(/[""„‟]/g, '"');

function logAction(orderNum, action, reason, currentNote, finalNote, result) {
  const logEntry = JSON.stringify({
    Order: orderNum,
    Action: action,
    Reason: reason,
    "Current Note": currentNote,
    "Final Note": finalNote,
    Result: result,
    Timestamp: new Date().toISOString()
  }, null, 2);
  try {
    appendFileSync(logFile, logEntry + ',\n');
  } catch (e) {
    console.error(`Warning: Could not write to log file: ${e.message}`);
  }
  console.log(`[Order #${orderNum}] ${result}: ${action} - ${reason}`);
}

function backupOrder(orderNum, note) {
  const file = `${backupsDir}/order_${orderNum}_backup_${Date.now()}.json`;
  writeFileSync(file, JSON.stringify({ orderNum, note, timestamp: new Date().toISOString() }, null, 2));
  return file;
}

function gql(query) {
  return new Promise((res, rej) => {
    const body = JSON.stringify({ query });
    const req = https.request({
      hostname: STORE, method: 'POST',
      path: `/admin/api/${VERSION}/graphql.json`,
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej);
    req.write(body);
    req.end();
  });
}

async function getOrderNoteAndId(num) {
  const r = await gql(`{
    orders(first: 1, query: "name:#${num}") {
      edges { node { id name note } }
    }
  }`);
  const n = r.data?.orders?.edges?.[0]?.node;
  if (!n) return null;
  return { id: n.id, note: n.note || '' };
}

async function updateOrderNote(id, note) {
  if (DRY_RUN) return { order: { note } }; // Mock success for dry run
  const escaped = note
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
  const r = await gql(`mutation {
    orderUpdate(input: { id: "${id}", note: "${escaped}" }) {
      order { name note }
      userErrors { field message }
    }
  }`);
  return r.data?.orderUpdate;
}

function areSetsEqual(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  console.log('================================================================');
  console.log('   PHASE 6: PRODUCTION SYNC');
  console.log('================================================================\n');

  if (DRY_RUN) console.log('>>> RUNNING IN DRY_RUN MODE (No Shopify writes) <<<\n');

  const stats = {
    Updated: 0,
    Skipped: 0,
    Blocked: 0,
    Failed: 0,
    Manual: 0
  };

  // 1. Identify blocked orders
  const blockedOrders = new Set();
  blockedOrders.add('1504'); // CRITICAL - Needs worksheet manual fix
  blockedOrders.add('1498'); // HIGH - Needs NAMDE -> NAMDU typo fix approval

  for (const risk of riskReport.risks) {
    if (!risk.canProceed) {
      blockedOrders.add(risk.orderNum);
      if (risk.category === 'MANUAL_REVIEW') stats.Manual++;
    }
  }
  stats.Blocked = blockedOrders.size;

  // 2. Gather safe orders
  const safeSimulations = phase4Sim.simulations.filter(s => !blockedOrders.has(s.orderNum) && s.hasChanges);
  const toProcess = safeSimulations;
  
  console.log(`Found ${safeSimulations.length} safe orders requiring changes.`);
  console.log(`Processing with BATCH_SIZE limit of ${BATCH_SIZE > 0 ? BATCH_SIZE : 'Unlimited'} successful writes...`);
  console.log(`WRITE_BUNDLE_COMPONENTS is ${WRITE_BUNDLE_COMPONENTS ? 'ON' : 'OFF'}`);
  console.log(`APPROVE_LEGACY_REMOVE is ${APPROVE_LEGACY_REMOVE ? 'ON' : 'OFF'}\n`);
  console.log('────────────────────────────────────────────────────────────────');

  let updateCount = 0;

  // 3. Process loop
  for (const sim of toProcess) {
    const orderNum = sim.orderNum;
    const shopifyOrder = await getOrderNoteAndId(orderNum);
    
    if (!shopifyOrder) {
      console.log(`✗ Order #${orderNum} not found in Shopify.`);
      stats.Failed++;
      continue;
    }

    const currentNoteLive = shopifyOrder.note;
    const currentLinesLive = currentNoteLive.split('\n').map(l => l.trim()).filter(Boolean);

    // 4. Build expected final note
    let expectedFinalLines = [];
    
    // Add expected canonical lines
    sim.expectedActions.forEach(ea => {
      if (ea.action === 'KEEP' || ea.action === 'ADD') {
        expectedFinalLines.push(ea.line);
      } else if (ea.action === 'REPLACE') {
        expectedFinalLines.push(ea.line);
        if (!APPROVE_LEGACY_REMOVE && ea.legacyLine) {
           // If legacy removal is not approved, we must keep the legacy line too.
           expectedFinalLines.push(ea.legacyLine);
        }
      } else if (ea.action === 'BUNDLE' && WRITE_BUNDLE_COMPONENTS) {
        expectedFinalLines.push(ea.line);
      }
    });

    // Add extra lines to keep
    sim.extraActions.forEach(ea => {
      if (ea.action === 'EXTRA_KEEP' || ea.action === 'EXTRA_FLAG' || ea.action === 'EXTRA_UNKNOWN') {
        expectedFinalLines.push(ea.line);
      }
      if (ea.action === 'LEGACY_REMOVE' && !APPROVE_LEGACY_REMOVE) {
        expectedFinalLines.push(ea.line);
      }
    });

    // Preserve completely new, post-simulation human-added lines
    const simulatedOldLines = new Set(sim.currentLines.map(normQ));
    currentLinesLive.forEach(liveLine => {
      if (!simulatedOldLines.has(normQ(liveLine)) && !expectedFinalLines.some(fl => normQ(fl) === normQ(liveLine))) {
        expectedFinalLines.push(liveLine);
      }
    });

    // 5. Compare via normalized sets
    // Instead of raw string comparison, we normalize all lines and compare them as sets
    const currentSet = new Set(currentLinesLive.map(normQ));
    const expectedSet = new Set(expectedFinalLines.map(normQ));

    // To construct the final string, we deduplicate ignoring case/quotes using normQ as key
    const deduplicatedFinalLines = [];
    const seenFinal = new Set();
    
    for (const line of expectedFinalLines) {
      const n = normQ(line);
      if (!seenFinal.has(n)) {
        seenFinal.add(n);
        deduplicatedFinalLines.push(line);
      }
    }
    
    const finalNoteString = deduplicatedFinalLines.join('\n');

    if (areSetsEqual(currentSet, expectedSet)) {
      logAction(orderNum, "SKIP", "Identical to expected final note (normalized sets match)", currentNoteLive, finalNoteString, "SKIPPED_IDENTICAL");
      stats.Skipped++;
      continue;
    }

    let reasonParts = [];
    if (sim.counts.ADD > 0) reasonParts.push(`ADD ${sim.counts.ADD}`);
    if (sim.counts.REPLACE > 0) reasonParts.push(`REPLACE ${sim.counts.REPLACE}`);
    if (sim.counts.BUNDLE > 0 && WRITE_BUNDLE_COMPONENTS) reasonParts.push(`BUNDLE_ADD ${sim.counts.BUNDLE}`);
    const reasonStr = `Applying updates: ` + reasonParts.join(', ');
    
    // 6. Backup before write
    const backupFile = backupOrder(orderNum, currentNoteLive);
    if (!DRY_RUN) console.log(`[Backup] Order #${orderNum} saved to ${backupFile}`);

    // 7. Execute Write & Verify with Retry
    const writeAndVerify = async () => {
      const updateResult = await updateOrderNote(shopifyOrder.id, finalNoteString);
      if (updateResult?.userErrors?.length > 0) {
        return { success: false, err: updateResult.userErrors[0].message };
      }

      if (DRY_RUN) return { success: true };

      await sleep(2000); // Shopify propagation delay
      const verifyOrder = await getOrderNoteAndId(orderNum);
      
      const verifySet = new Set((verifyOrder.note || '').split('\n').map(l => normQ(l.trim())).filter(Boolean));
      if (!areSetsEqual(verifySet, expectedSet)) {
         return { success: false, err: "Verification set mismatch", verifyNote: verifyOrder.note };
      }
      return { success: true };
    };

    let result = await writeAndVerify();
    
    if (!result.success && !DRY_RUN) {
       console.log(`[Warning] Write/Verify failed for #${orderNum}. Retrying once...`);
       await sleep(3000);
       result = await writeAndVerify();
    }

    if (!result.success) {
      logAction(orderNum, "VERIFY_RETRY", "Post-write verification failed", finalNoteString, result.verifyNote || "", "FAILED_VERIFY");
      console.error(`\n[FATAL ERROR] Post-write verification failed for Order #${orderNum}!`);
      console.error(`Backup preserved at: ${backupFile}`);
      stats.Failed++;
      break; // Stop execution
    }

    logAction(orderNum, "MERGE_UPDATE", reasonStr, currentNoteLive, finalNoteString, DRY_RUN ? "DRY_RUN_SUCCESS" : "SUCCESS_VERIFIED");
    stats.Updated++;
    updateCount++;

    if (BATCH_SIZE > 0 && updateCount >= BATCH_SIZE) {
      console.log(`\nReached BATCH_SIZE limit of ${BATCH_SIZE} successful updates.`);
      break;
    }
  }

  // 8. Final Execution Summary
  console.log('\n================================================================');
  console.log('   EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`  Updated : ${stats.Updated}`);
  console.log(`  Skipped : ${stats.Skipped}`);
  console.log(`  Blocked : ${stats.Blocked}`);
  console.log(`  Failed  : ${stats.Failed}`);
  console.log(`  Manual  : ${stats.Manual}`);
  console.log('================================================================\n');
}

main().catch(console.error);
