import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// Active theme ID used in other scripts
const THEME_ID = '150920200366';
const BASE = `https://${STORE}/admin/api/${API_VERSION}/themes/${THEME_ID}/assets.json`;

async function fetchAsset(key) {
  const res = await fetch(`${BASE}?asset[key]=${key}`, { headers: H });
  const data = await res.json();
  if (!data.asset) throw new Error(`Failed to fetch ${key}`);
  return data.asset.value;
}

async function pushAsset(key, value) {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ asset: { key, value } })
  });
  const data = await res.json();
  if (data.asset) {
    console.log(`[SUCCESS] Pushed ${key}`);
  } else {
    console.error(`[ERROR] Failed to push ${key}:`, data.errors);
  }
}

async function main() {
  console.log("Fetching live theme.liquid...");
  let themeLiq = await fetchAsset('layout/theme.liquid');
  
  // Remove the noindex_handles logic
  // The block looks like:
  // {%- assign noindex_handles = '...' | split: ',' -%}
  // {%- assign _noindex = false -%}
  // ...
  // {%- if _noindex -%}
  //   <meta name="robots" content="noindex, nofollow">
  // {%- else -%}
  //   <meta name="robots" content="index, follow">
  // {%- endif -%}

  const regex = /\{%- assign noindex_handles = [^%]+%\}\s*\{%- assign _noindex = false -%\}\s*\{%- if request\.page_type == 'page' and noindex_handles contains page\.handle -%\}\s*\{%- assign _noindex = true -%\}\s*\{%- elsif request\.page_type == 'search' or request\.page_type == 'cart' or request\.page_type == '404' -%\}\s*\{%- assign _noindex = true -%\}\s*\{%- elsif request\.page_type == 'password' -%\}\s*\{%- assign _noindex = true -%\}\s*\{%- elsif request\.page_type == 'blog' and current_tags\.size > 0 -%\}\s*\{%- assign _noindex = true -%\}\s*\{%- elsif request\.page_type == 'product' and product\.description == blank -%\}\s*\{%- assign _noindex = true -%\}\s*\{%- endif -%\}\s*\{%- if _noindex -%\}\s*<meta name="robots" content="noindex, nofollow">\s*\{%- else -%\}\s*<meta name="robots" content="index, follow">\s*\{%- endif -%\}/g;

  if (regex.test(themeLiq)) {
    themeLiq = themeLiq.replace(regex, '');
    console.log("Modified theme.liquid (removed noindex hack)");
    await pushAsset('layout/theme.liquid', themeLiq);
  } else {
    console.log("Could not find exact noindex block in theme.liquid. Doing manual replace.");
    // Fallback if formatting changed slightly
    const startIdx = themeLiq.indexOf("{%- assign noindex_handles");
    const endIdx = themeLiq.indexOf("</head>");
    if (startIdx > -1 && endIdx > -1) {
       // It's safer to just let the script fail if the regex doesn't match perfectly
       console.log("Regex failed. Skipping theme.liquid to be safe.");
    }
  }

  console.log("Fetching live microdata-schema.liquid...");
  let schemaLiq = await fetchAsset('snippets/microdata-schema.liquid');
  
  // Wrap Organization and LocalBusiness in index check
  if (!schemaLiq.includes("{%- if request.page_type == 'index' -%}\n  <script type=\"application/ld+json\">\n  {\n    \"@context\": \"https://schema.org\",\n    \"@type\": \"Organization\"")) {
    
    // Find the comment for Organization
    const orgComment = "{%- comment -%} Organization — sitewide, sports memorabilia business description {%- endcomment -%}";
    const newOrgComment = "{%- comment -%} Organization — homepage only {%- endcomment -%}\n{%- if request.page_type == 'index' -%}";
    
    const localBizEndStr = "\"url\": {{ shop.url | json }}\n  }\n</script>";
    
    // Basic string replace
    if (schemaLiq.includes(orgComment)) {
      let modified = schemaLiq.replace(orgComment, newOrgComment);
      // Now close the if block after LocalBusiness
      modified = modified.replace(localBizEndStr, localBizEndStr + "\n{%- endif -%}");
      
      console.log("Modified microdata-schema.liquid (wrapped Organization/LocalBusiness)");
      await pushAsset('snippets/microdata-schema.liquid', modified);
    } else {
      console.log("Could not find Organization comment block.");
    }
  } else {
    console.log("microdata-schema.liquid already patched.");
  }
}
main();
