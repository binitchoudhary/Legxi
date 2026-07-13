// Copies shared/*.js into transfer-service/_shared/ before each deploy (see firebase.json's
// "predeploy" hook for the transfer codebase). Firebase Functions Gen2 packages each
// codebase's source directory in isolation — a `file:../shared` npm dependency doesn't
// survive that packaging (confirmed via a failed deploy: ERR_MODULE_NOT_FOUND). Copying the
// files in-tree, automatically, on every deploy keeps `shared/` as the single source of
// truth while making the artifact self-contained. Does not touch functions/ (Authentication)
// at all — Auth's codebase does not consume shared/ in this migration.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src  = path.join(root, 'shared');
const dest = path.join(root, 'transfer-service', '_shared');

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const file of fs.readdirSync(src)) {
  if (file === 'package.json') continue; // not needed once copied in-tree, no longer an npm package
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log(`[sync-shared] copied shared/ -> transfer-service/_shared/ (${fs.readdirSync(dest).join(', ')})`);
