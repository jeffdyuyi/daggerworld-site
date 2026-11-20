import {defineConfig} from 'vite';

export default defineConfig({
  root:'adventure-canvas',
  base:'./',
  build:{outDir:'../dist/adventure-canvas',emptyOutDir:false,reportCompressedSize:false,minify:process.platform !== 'win32'},
});
