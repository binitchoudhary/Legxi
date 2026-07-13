// Patches ONLY Trinity's own copy of the Register Interest block's #legxi-ri-btn CSS,
// replacing its hardcoded box-model (padding/font/no-border-radius) with the theme's
// shared button component's CSS custom properties, so it renders at the exact same
// dimensions the original "CONNECT WITH A COLLECTIBLES SPECIALIST" button (type: "button",
// solid, stretch) used to. Pure text replacement on the raw file — does not touch
// Arshdeep's page at all (separate JSON block instance, never read/written here).
//
// Usage: node fix-trinity-ri-button-sizing.mjs <target-trinity-set-file>
import { readFileSync, writeFileSync } from 'fs';

const [, , targetPath] = process.argv;
if (!targetPath) {
  console.error('Usage: node fix-trinity-ri-button-sizing.mjs <target-trinity-set-file>');
  process.exit(1);
}

let text = readFileSync(targetPath, 'utf8');

const oldCss = '  #legxi-ri-btn {\\n    display: block;\\n    width: 100%;\\n    padding: 14px 24px;\\n    background-color: #000;\\n    color: #fff;\\n    font-family: inherit;\\n    font-size: 14px;\\n    font-weight: 600;\\n    letter-spacing: 0.08em;\\n    text-transform: uppercase;\\n    border: none;\\n    cursor: pointer;\\n    transition: background-color 0.2s ease;\\n  }';

const newCss = '  #legxi-ri-btn {\\n    display: block;\\n    width: 100%;\\n    padding: var(--button-padding-block, .75rem) var(--button-padding-inline, 1.5rem);\\n    background-color: #000;\\n    color: #fff;\\n    font: var(--button-font);\\n    letter-spacing: var(--button-letter-spacing);\\n    text-transform: var(--button-text-transform);\\n    border-radius: var(--button-border-radius);\\n    border: none;\\n    cursor: pointer;\\n    transition: background-color 0.2s ease;\\n  }';

const count = text.split(oldCss).length - 1;
if (count !== 1) {
  console.error(`Expected exactly 1 occurrence of the old CSS block, found ${count}. Aborting — anchor text may not match exactly.`);
  process.exit(1);
}

text = text.replace(oldCss, newCss);

// Validate still well-formed JSON before writing.
JSON.parse(text);

writeFileSync(targetPath, text, 'utf8');
console.log(`Patched ${targetPath}: #legxi-ri-btn CSS now uses theme button variables (padding/font/border-radius) instead of hardcoded values.`);
