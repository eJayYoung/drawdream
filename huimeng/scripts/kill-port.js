const { execSync } = require('child_process');
const ports = process.argv.slice(2).map(p => parseInt(p)).filter(p => p > 0);
if (ports.length === 0) ports = [8777, 8778];
ports.forEach(port => {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && Number(pid) && pid !== '0') {
        try {
          process.kill(Number(pid), 'SIGKILL');
          console.log(`Killed PID ${pid} on port ${port}`);
        } catch (e) {}
      }
    });
  } catch (e) {}
});
