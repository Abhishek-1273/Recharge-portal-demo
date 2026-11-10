const { spawn } = require('child_process');

function run() {
  console.log('[Tunnel Keeper] Launching permanent tunnel for recharge-partner-portal...');
  const tunnel = spawn('npx', ['--yes', 'localtunnel', '--port', '3000', '--subdomain', 'recharge-partner-portal'], {
    shell: true,
    stdio: 'inherit'
  });

  tunnel.on('close', (code) => {
    console.log(`[Tunnel Keeper] Tunnel process closed (${code}). Auto-reconnecting in 2 seconds...`);
    setTimeout(run, 2000);
  });

  tunnel.on('error', (err) => {
    console.error('[Tunnel Keeper] Error:', err.message);
    setTimeout(run, 3000);
  });
}

run();

