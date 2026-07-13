import 'dotenv/config';
import { executeGraphQL } from './src/shopify/client.js';

async function test() {
  const MUTATION = `
  mutation draftOrderComplete($id: ID!, $paymentPending: Boolean!) {
    draftOrderComplete(id: $id, paymentPending: $paymentPending) {
      draftOrder {
        order {
          id
          name
        }
      }
      userErrors { field message }
    }
  }`;
  
  const res = await executeGraphQL(MUTATION, { id: "gid://shopify/DraftOrder/1202448826561", paymentPending: true }, "draftOrderComplete", "req-1");
  console.log(JSON.stringify(res, null, 2));
}

test();
