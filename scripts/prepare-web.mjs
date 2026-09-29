import { copyFile,mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const destination=new URL('apps/mobile/public/',root);
await mkdir(destination,{recursive:true});
await copyFile(new URL('node_modules/pdfjs-dist/build/pdf.worker.min.mjs',root),new URL('pdf.worker.min.mjs',destination));
console.log('Prepared local PDF worker.');
