import { google } from 'googleapis';
import http from 'http';
import fs from 'fs/promises';
import url from 'url';

const CREDENTIALS_PATH = 'C:\\Users\\DELL\\Downloads\\client_secret_786413194609-5pfegkmfd7rpfvaevrmb6r4p0r9kkp8q.apps.googleusercontent.com.json';
const TOKEN_PATH = 'google-token.json';
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly', // GSC read-only
  'https://www.googleapis.com/auth/content', // GMC
  'https://www.googleapis.com/auth/analytics.readonly' // GA4
];
const PORT = 3000;

async function authenticate() {
  let credentialsRaw;
  try {
    credentialsRaw = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  } catch (err) {
    console.error(`\n[ERROR] Cannot find ${CREDENTIALS_PATH}.`);
    process.exit(1);
  }

  const credentials = JSON.parse(credentialsRaw);
  const keys = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    `http://localhost:${PORT}/oauth2callback`
  );

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
          const code = qs.get('code');
          console.log('\n[INFO] Authorization code received. Exchanging for tokens...');
          
          res.end('Authentication successful! You can close this tab and return to the terminal.');
          server.close();
          
          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          
          await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
          console.log(`\n[SUCCESS] Token securely saved to ${TOKEN_PATH}.`);
          resolve(oAuth2Client);
        }
      } catch (e) {
        console.error('\n[ERROR] Failed to exchange token:', e.message);
        reject(e);
      }
    }).listen(PORT, () => {
      const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
      });
      console.log('AUTHORIZE_URL=' + authorizeUrl);
    });
  });
}

authenticate().catch(console.error);
