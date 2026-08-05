const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
  });
  return results;
}
walk('src').forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/['"]@\/(utils|lib\/utils)['"]/g, "'@/utils/utils'");
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
  }
});
