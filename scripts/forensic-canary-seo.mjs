import 'dotenv/config';
import fs from 'fs';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE || 'legxi.co';
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function run() {
  const GID = "gid://shopify/Product/9132640731310";
  let log = "";
  
  // 1. Fetch BEFORE values
  const beforeRes = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({
      query: `{ product(id: "${GID}") { seo { title description } metafield(namespace:"global", key:"description_tag") { value } } }`
    })
  });
  const beforeJson = await beforeRes.json();
  
  log += "### 1. BEFORE VALUES (Live Shopify Data)\n";
  log += "```json\n" + JSON.stringify(beforeJson, null, 2) + "\n```\n\n";
  
  // 2. Perform explicit Mutation
  const proposedDesc = "Forensic Verification: Campeones Edition Frame.";
  const proposedTitle = "Forensic Title";
  
  const mutPayload = {
    query: `mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { seo { title description } }
        userErrors { field message }
      }
    }`,
    variables: { input: { id: GID, seo: { title: proposedTitle, description: proposedDesc } } }
  };
  
  log += "### 2. RAW GRAPHQL MUTATION REQUEST\n";
  log += "```json\n" + JSON.stringify(mutPayload, null, 2) + "\n```\n\n";
  
  const mutRes = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify(mutPayload)
  });
  const mutJson = await mutRes.json();
  
  log += "### 3. RAW GRAPHQL MUTATION RESPONSE\n";
  log += "```json\n" + JSON.stringify(mutJson, null, 2) + "\n```\n\n";
  
  // Wait a few seconds for eventual consistency
  await new Promise(r => setTimeout(r, 5000));
  
  // 3. Read Back
  const afterRes = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({
      query: `{ product(id: "${GID}") { seo { title description } metafield(namespace:"global", key:"description_tag") { value } } }`
    })
  });
  const afterJson = await afterRes.json();
  
  log += "### 4. RAW GRAPHQL READ-BACK RESPONSE\n";
  log += "```json\n" + JSON.stringify(afterJson, null, 2) + "\n```\n\n";
  
  fs.writeFileSync('C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a\\\\FORENSIC_CANARY_LOG.md', log);
}

run().catch(console.error);
