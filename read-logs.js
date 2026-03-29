const fs = require('fs');
try {
  const data = fs.readFileSync('system_logs.json');
  console.log('File size:', data.length);
  // Try UTF-16LE
  const str = data.toString('utf16le');
  console.log('Last 500 chars (utf16le):', str.slice(-500));
} catch (e) {
  console.error(e);
}
