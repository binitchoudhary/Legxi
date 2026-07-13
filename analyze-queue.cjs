const fs = require('fs');
const risk = JSON.parse(fs.readFileSync('phase5-risk-report.json'));
const sim = JSON.parse(fs.readFileSync('phase4-simulation.json'));

const blocked = new Set();
risk.risks.filter(r => !r.canProceed).forEach(r => blocked.add(r.orderNum));
blocked.add('1504');
blocked.add('1498');

const normQ = s => s.replace(/[''‚‛]/g, "'").replace(/[""„‟]/g, '"');

function areSetsEqual(a, b) {
  if(a.size !== b.size) return false;
  for(const x of a) if(!b.has(x)) return false;
  return true;
}

const queue = [];
sim.simulations.forEach(s => {
  let status = 'SKIP';
  if (blocked.has(s.orderNum)) {
    const reason = risk.risks.find(r => r.orderNum === s.orderNum)?.category;
    status = (reason === 'MANUAL_REVIEW') ? 'MANUAL' : 'BLOCKED';
  } else if (s.hasChanges) {
    let expectedFinalLines = [];
    s.expectedActions.forEach(ea => {
      if (['KEEP','ADD'].includes(ea.action)) expectedFinalLines.push(ea.line);
      if (ea.action === 'REPLACE') {
        expectedFinalLines.push(ea.line);
        if (ea.legacyLine) expectedFinalLines.push(ea.legacyLine);
      }
    });
    s.extraActions.forEach(ea => {
      if (['EXTRA_KEEP','EXTRA_FLAG','EXTRA_UNKNOWN','LEGACY_REMOVE'].includes(ea.action)) {
        expectedFinalLines.push(ea.line);
      }
    });
    const currentSet = new Set(s.currentLines.map(normQ));
    const expectedSet = new Set(expectedFinalLines.map(normQ));
    if (!areSetsEqual(currentSet, expectedSet)) {
      status = 'WRITE';
    }
  }
  queue.push({ order: s.orderNum, status });
});

console.log('WRITE:', queue.filter(q => q.status === 'WRITE').map(q => q.order).join(', '));
console.log('SKIP:', queue.filter(q => q.status === 'SKIP').map(q => q.order).join(', '));
console.log('BLOCKED:', queue.filter(q => q.status === 'BLOCKED').map(q => q.order).join(', '));
console.log('MANUAL:', queue.filter(q => q.status === 'MANUAL').map(q => q.order).join(', '));
