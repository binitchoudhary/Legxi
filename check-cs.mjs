async function check() {
  const res = await fetch('https://legxi.co/?v=' + Date.now());
  const html = await res.text();
  const match = html.match(/<script[^>]+contentsquare[^>]+>/i);
  console.log("Live tag:", match ? match[0] : "Not found");
}
check();
