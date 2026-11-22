const https = require('https');

const url = 'https://dnd.huijiwiki.com/wiki/%E6%96%87%E4%BB%B6:Book-FRAiF-218-map-faerun.webp';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => { if (data.length < 2000) data += chunk; });
  res.on('end', () => {
    console.log('Body preview:', data.slice(0, 300));
  });
}).on('error', (e) => {
  console.log('Error:', e.message);
});

