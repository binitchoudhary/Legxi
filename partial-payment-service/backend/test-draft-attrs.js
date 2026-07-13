import 'dotenv/config';
import { executeGraphQL } from './src/shopify/client.js';

async function testDraftOrderUpdate() {
  const MUTATION = `
  mutation draftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
    draftOrderUpdate(id: $id, input: $input) {
      draftOrder {
        id
        customAttributes { key value }
      }
      userErrors { field message }
    }
  }`;
  
  // Create a quick draft order first
  const createRes = await executeGraphQL(`mutation draftOrderCreate { draftOrderCreate(input: { lineItems: [{title: "Test", originalUnitPrice: 100, quantity: 1}]}) { draftOrder { id } } }`, {}, "draftOrderCreate", "req-1");
  const draftId = createRes.data?.draftOrderCreate?.draftOrder?.id;
  
  if (!draftId) {
    console.error("Failed to create draft", JSON.stringify(createRes, null, 2));
    return;
  }
  
  // Update it
  const updateRes = await executeGraphQL(MUTATION, { 
    id: draftId, 
    input: { customAttributes: [{key: "test", value: "value"}] } 
  }, "draftOrderUpdate", "req-2");
  console.log("Draft Update:", JSON.stringify(updateRes, null, 2));

  // Complete it
  const completeRes = await executeGraphQL(`mutation draftOrderComplete { draftOrderComplete(id: "${draftId}", paymentPending: true) { draftOrder { order { id customAttributes { key value } } } userErrors { field message } } }`, {}, "draftOrderComplete", "req-3");
  console.log("Complete Draft:", JSON.stringify(completeRes, null, 2));
}

testDraftOrderUpdate();
