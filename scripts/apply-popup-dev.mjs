/**
 * Adds specialist-form popup sections to the two product templates on the DEV theme.
 * Preview at: https://5ci887-xv.myshopify.com/?preview_theme_id=152614928558
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV     = 152614928558;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const POPUP_SECTIONS = {
  specialist_form_apps: {
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
  },
  specialist_form_popup: {
    type: 'specialist-form-popup',
    settings: {},
  },
};

const TEMPLATES = [
  'templates/product.campeones-world-cup-2022.json',
  'templates/product.la-scaloneta-2026-edition.json',
];

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

// Also push the popup section file to dev theme
const popupSection = readFileSync('theme/sections/specialist-form-popup.liquid', 'utf8');
console.log('Pushing specialist-form-popup.liquid to dev theme...');
await push('sections/specialist-form-popup.liquid', popupSection);
console.log('✓ sections/specialist-form-popup.liquid pushed\n');
await new Promise(r => setTimeout(r, 700));

for (const templateKey of TEMPLATES) {
  const localFile = `live-templates/${templateKey.replace('templates/', '')}`;
  const template = JSON.parse(readFileSync(localFile, 'utf8'));

  if (!template.sections.specialist_form_apps) {
    template.sections.specialist_form_apps = POPUP_SECTIONS.specialist_form_apps;
  }
  if (!template.sections.specialist_form_popup) {
    template.sections.specialist_form_popup = POPUP_SECTIONS.specialist_form_popup;
  }

  const order = template.order;
  const mainIdx = order.indexOf('main');
  if (!order.includes('specialist_form_apps')) {
    order.splice(mainIdx + 1, 0, 'specialist_form_apps');
  }
  if (!order.includes('specialist_form_popup')) {
    const appsIdx = order.indexOf('specialist_form_apps');
    order.splice(appsIdx + 1, 0, 'specialist_form_popup');
  }

  const updated = JSON.stringify(template, null, 2);
  writeFileSync(`live-templates/updated-${templateKey.replace('templates/', '')}`, updated);

  console.log(`Pushing ${templateKey} to dev...`);
  try {
    await push(templateKey, updated);
    console.log(`✓ ${templateKey} pushed\n`);
  } catch (e) {
    console.error(`✗ ${e.message}\n`);
  }
  await new Promise(r => setTimeout(r, 700));
}

console.log('Done.\n');
console.log('Preview links:');
console.log('  Campeones: https://5ci887-xv.myshopify.com/products/campeones-world-cup-2022?preview_theme_id=152614928558');
console.log('  La Scaloneta: https://5ci887-xv.myshopify.com/products/la-scaloneta-2026-edition?preview_theme_id=152614928558');
