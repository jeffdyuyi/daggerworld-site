const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('HTML length:', html.length);
console.log('Has #preview:', html.includes('id="preview"'));
console.log('Has </style>:', html.includes('</style>'));
console.log('Has </script>:', html.includes('</script>'));

