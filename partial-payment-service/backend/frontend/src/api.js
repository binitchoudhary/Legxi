export async function dashboardFetch(path, options = {}) {
  // shopify.idToken() automatically provides the session token from App Bridge v4
  let token;
  try {
    token = await shopify.idToken();
  } catch (err) {
    console.error('Failed to get Shopify session token', err);
    throw new Error('Authentication failed');
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }

  return res.json();
}
