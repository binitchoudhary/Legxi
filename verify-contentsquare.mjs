async function verify() {
  const url = 'https://legxi.co/';
  const res = await fetch(url);
  const html = await res.text();
  
  if (res.status === 200) {
    console.log("HTTP 200 OK (No Liquid crash)");
  } else {
    console.log(`HTTP ${res.status} Error`);
  }
  
  if (html.includes('Liquid error:')) {
    console.log("Liquid Error detected in output!");
  } else {
    console.log("No Liquid errors detected.");
  }
  
  if (html.includes('<script defer src="https://t.contentsquare.net/uxa/136fa8c9d3f3e.js"></script>')) {
    console.log("Contentsquare script is verified live with defer.");
  } else {
    console.log("Failed to find deferred script in live HTML.");
  }
}
verify();
