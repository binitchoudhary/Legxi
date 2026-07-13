import 'dotenv/config';
import { executeGraphQL } from './src/shopify/client.js';

async function checkSchema() {
  const QUERY = `
  {
    __type(name: "DraftOrderInput") {
      fields {
        name
        type { name kind ofType { name kind } }
      }
    }
  }`;
  
  const res = await executeGraphQL(QUERY, {}, "SchemaCheck", "req-schema");
  console.log(JSON.stringify(res, null, 2));
}

checkSchema();
