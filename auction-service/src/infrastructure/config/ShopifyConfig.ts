export class ShopifyConfig {
  static get storeDomain(): string {
    const domain = process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN;
    if (!domain) {
      throw new Error('Missing SHOPIFY_STORE_DOMAIN environment variable');
    }
    return domain;
  }

  static get adminToken(): string {
    const token = process.env.SHOPIFY_ADMIN_TOKEN;
    if (!token) {
      throw new Error('Missing SHOPIFY_ADMIN_TOKEN environment variable');
    }
    return token;
  }

  static get webhookSecret(): string {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('Missing SHOPIFY_WEBHOOK_SECRET environment variable');
    }
    return secret;
  }

  static get apiVersion(): string {
    return process.env.SHOPIFY_API_VERSION || '2025-10';
  }
}
