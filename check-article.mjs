async function check() {
  const res = await fetch('https://legxi.co/blogs/news/goc-artwork-making-of-the-edition');
  console.log("Status:", res.status);
  console.log("URL:", res.url);
  const html = await res.text();
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  console.log("Canonical:", canonical ? canonical[1] : 'None');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  console.log("Title:", title ? title[1].trim() : 'None');
}
check();
