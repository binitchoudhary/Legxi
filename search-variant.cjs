const fs = require('fs');
const js = fs.readFileSync('theme.js.downloaded', 'utf8');
let searchIdx = 0;
while (true) {
  const nextIdx = js.indexOf('variant:change', searchIdx);
  if (nextIdx === -1) break;
  console.log('--- variant:change at ' + nextIdx + ' ---');
  console.log(js.substring(Math.max(0, nextIdx - 200), Math.min(js.length, nextIdx + 200)));
  searchIdx = nextIdx + 1;
}
