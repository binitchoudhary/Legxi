const fs = require('fs');
const js = fs.readFileSync('theme.js.downloaded', 'utf8');

// Find all occurrences of variant:change dispatched
let offset = 0;
while (true) {
  const idx = js.indexOf('dispatchEvent(new CustomEvent("variant:change"', offset);
  if (idx === -1) break;
  console.log('--- variant:change dispatch found at ' + idx + ' ---');
  console.log(js.substring(Math.max(0, idx - 300), Math.min(js.length, idx + 300)));
  offset = idx + 1;
}

// Check onFormChanged
const onFormChanged = js.indexOf('onFormChanged_fn');
if (onFormChanged !== -1) {
  console.log('--- onFormChanged ---');
  console.log(js.substring(onFormChanged, onFormChanged + 1000));
}

// Search for anything setting quantity to 1
const qty1 = js.indexOf('.value = 1');
if (qty1 !== -1) {
  console.log('--- .value = 1 found at ' + qty1 + ' ---');
}
