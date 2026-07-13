const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000, subdomain: 'legxipartial' });
    console.log("TUNNEL_URL=" + tunnel.url);
    
    tunnel.on('close', () => {
      console.log("Tunnel closed, restarting...");
      setTimeout(startTunnel, 1000);
    });
    
    tunnel.on('error', (err) => {
      console.error("Tunnel error:", err);
      setTimeout(startTunnel, 1000);
    });
  } catch (err) {
    console.error("Failed to start tunnel:", err);
    setTimeout(startTunnel, 1000);
  }
}

startTunnel();
