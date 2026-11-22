const https = require('https');
const fs = require('fs');

const url = 'https://huiji-public.huijistatic.com/dnd/uploads/5/5f/Book-FRAiF-218-map-faerun.webp';
const localDest = 'assets/Book-FRAiF-218-map-faerun.webp';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://dnd.huijiwiki.com/',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
  }
};

https.get(url, options, (res) => {
  console.log('Status with referer:', res.statusCode);
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

