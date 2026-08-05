import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE || 'legxi.co';
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

export async function POST(request: NextRequest) {
  if (!SHOPIFY_TOKEN) {
    return NextResponse.json({ error: 'Shopify token missing' }, { status: 500 });
  }

  try {
    const { productIds } = await request.json();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ products: {} });
    }

    // Shopify Admin API requires IDs in GID format. They are already in GID format from the DB.
    // Querying multiple products by ID using GraphQL `nodes`
    const query = `
      query getProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            vendor
            handle
            images(first: 5) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({
        query,
        variables: { ids: productIds }
      }),
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    const result = await response.json();

    if (result.errors) {
      console.error('Shopify GraphQL errors:', result.errors);
      return NextResponse.json({ error: 'Failed to fetch from Shopify' }, { status: 500 });
    }

    const nodes = result.data?.nodes || [];
    
    // Map array back to an object dictionary keyed by ID for easy O(1) lookup on client
    const productMap: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodes.forEach((node: any) => {
      if (node) {
        productMap[node.id] = {
          title: node.title,
          vendor: node.vendor,
          handle: node.handle,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          images: node.images?.edges?.map((e: any) => e.node.url) || [],
          image: node.images?.edges?.[0]?.node?.url || null
        };
      }
    });

    return NextResponse.json({ products: productMap });
  } catch (error) {
    console.error('Shopify resolver error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
