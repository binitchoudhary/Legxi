import { useQuery } from '@tanstack/react-query';

export function useShopifyProduct(shopifyProductId: string) {
  return useQuery({
    queryKey: ['shopifyProduct', shopifyProductId],
    queryFn: async () => {
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productIds: [shopifyProductId] })
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data.products[shopifyProductId] || null;
    },
    enabled: !!shopifyProductId,
    staleTime: 60 * 1000 // Cache for 1 minute
  });
}
