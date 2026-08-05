export async function getShopifyProducts(productIds: string[]) {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE || 'legxi.co';
  const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

  if (!SHOPIFY_TOKEN || !productIds || productIds.length === 0) return {};

  const query = `
    query getProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          vendor
          handle
          featuredImage {
            url
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables: { ids: productIds } }),
      next: { revalidate: 60 }
    });

    const result = await response.json();
    const nodes = result.data?.nodes || [];
    
    const productMap: Record<string, any> = {};
    nodes.forEach((node: any) => {
      if (node) {
        productMap[node.id] = {
          title: node.title,
          vendor: node.vendor,
          handle: node.handle,
          imageUrl: node.featuredImage?.url || null
        };
      }
    });

    return productMap;
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    return {};
  }
}
