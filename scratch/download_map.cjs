const https = require('https');
const fs = require('fs');

const url = 'https://huiji-public.huijistatic.com/dnd/uploads/5/5f/Book-FRAiF-218-map-faerun.webp';
const localDest = 'assets/Book-FRAiF-218-map-faerun.webp';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers['content-type'], res.headers['content-length']);
  if (res.statusCode === 200) {
    const file = fs.createWriteStream(localDest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      const stats = fs.statSync(localDest);
      console.log('Successfully saved to', localDest, 'Size:', stats.size, 'bytes');
    });
  }
}).on('error', (e) => {
  console.log('Error:', e.message);
});

