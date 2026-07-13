import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV     = 152614928558;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function push(key, value) {
  const res = await fetch(`${BASE}/themes/${DEV}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, value } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Push failed for ${key}: ${JSON.stringify(d.errors)}`);
  return d;
}

const template = JSON.parse(readFileSync('live-templates/product.trinity-set.json', 'utf8'));

// Save backup
writeFileSync('backups/product.trinity-set.ORIGINAL.json', JSON.stringify(template, null, 2));

// Add popup sections
template.sections.specialist_form_apps = {
  type: 'apps',
  blocks: {
    forms_inline_specialist: {
      type: 'shopify://apps/forms/blocks/inline/8744a304-fcb1-4347-b211-bb6b4759a76a',
      settings: {
        form_id: '980079',
        text_color: '#ffffff',
        button_background_color: '#0D3F4B',
        button_label_color: '#ffffff',
        links_color: '#1878B9',
        errors_color: '#E02229',
        text_alignment: 'left',
        form_alignment: 'flex-start',
        padding_top: 0,
        padding_bottom: 24,
        padding_right: 0,
        padding_left: 0,
      },
    },
    'section-header': {
      type: '_section-header',
      static: true,
      settings: {
        subheading: '',
        title: '',
        content: '',
        button_text: '',
        button_link: '',
        button_style: 'outline',
        text_alignment: 'left',
        heading_size: 'h3',
        title_icon: 'none',
        show_scrolling_title: false,
      },
      blocks: {},
    },
  },
  block_order: ['forms_inline_specialist'],
  settings: {
    color_scheme: '',
    add_vertical_spacing: false,
    add_horizontal_spacing: false,
  },
};

template.sections.specialist_form_popup = {
  type: 'specialist-form-popup',
  settings: {},
};

// Insert after 'main' in order
const order = template.order;
const mainIdx = order.indexOf('main');
order.splice(mainIdx + 1, 0, 'specialist_form_apps', 'specialist_form_popup');

const updated = JSON.stringify(template, null, 2);
writeFileSync('live-templates/updated-product.trinity-set.json', updated);

console.log('Pushing templates/product.trinity-set.json to dev...');
await push('templates/product.trinity-set.json', updated);
console.log('✓ Done.\n');
console.log('Preview: https://5ci887-xv.myshopify.com/products/legxi-champions-trinity-set-1?preview_theme_id=152614928558');
