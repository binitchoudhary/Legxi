import { google } from 'googleapis';
import fs from 'fs/promises';

const CREDENTIALS_PATH = 'C:\\Users\\DELL\\Downloads\\client_secret_786413194609-5pfegkmfd7rpfvaevrmb6r4p0r9kkp8q.apps.googleusercontent.com.json';
const TOKEN_PATH = 'google-token.json';

async function runAudit() {
  const credentialsRaw = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  const credentials = JSON.parse(credentialsRaw);
  const keys = credentials.installed || credentials.web;

  const auth = new google.auth.OAuth2(keys.client_id, keys.client_secret);
  const tokenRaw = await fs.readFile(TOKEN_PATH, 'utf8');
  auth.setCredentials(JSON.parse(tokenRaw));

  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const content = google.content({ version: 'v2.1', auth });

  const results = {
    gsc: { connected: false, error: null, sites: [], sitemaps: [], inspection: null },
    gmc: { connected: false, error: null, accounts: [], products: [] }
  };

  // 1. Verify GSC Connection
  try {
    const sitesRes = await searchconsole.sites.list();
    results.gsc.connected = true;
    results.gsc.sites = sitesRes.data.siteEntry || [];
    
    // Find legxi.co
    const targetSite = results.gsc.sites.find(s => s.siteUrl.includes('legxi.co'));
    if (targetSite) {
      // Get Sitemaps
      const sitemaps = await searchconsole.sitemaps.list({ siteUrl: targetSite.siteUrl });
      results.gsc.sitemaps = sitemaps.data.sitemap || [];

      // Inspect Homepage
      try {
        const inspect = await searchconsole.urlInspection.index.inspect({
          requestBody: { inspectionUrl: 'https://legxi.co/', siteUrl: targetSite.siteUrl }
        });
        results.gsc.inspection = inspect.data.inspectionResult;
      } catch(e) {
        results.gsc.inspection = { error: e.message };
      }
    }
  } catch (err) {
    results.gsc.error = err.message;
  }

  // 2. Verify GMC Connection
  try {
    // We need the Merchant ID. Usually available via accounts.authinfo or accounts.list
    const authinfo = await content.accounts.authinfo();
    results.gmc.connected = true;
    
    const accountIds = authinfo.data.accountIdentifiers || [];
    if (accountIds.length > 0) {
      const merchantId = accountIds[0].merchantId;
      results.gmc.merchantId = merchantId;

      // Get Product Statuses (this contains the disapproval/warnings)
      try {
        const statuses = await content.productstatuses.list({ merchantId, maxResults: 100 });
        results.gmc.products = statuses.data.resources || [];
      } catch (e) {
        results.gmc.productsError = e.message;
      }
    } else {
      results.gmc.error = "No Merchant Center accounts found for this Google User.";
    }
  } catch (err) {
    results.gmc.error = err.message;
  }

  await fs.writeFile('google-audit-results.json', JSON.stringify(results, null, 2));
  console.log('[SUCCESS] Audit data written to google-audit-results.json');
}

runAudit().catch(console.error);
