import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const gasDir = path.join(root, 'gas');
let html = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');

async function inlineAsset(assetPath, tagType) {
  const cleanPath = assetPath.replace(/^\//, '');
  const fullPath = path.join(distDir, cleanPath);
  const content = await fs.readFile(fullPath, 'utf8');
  if (tagType === 'script') return '<script>\n' + content + '\n</script>';
  return '<style>\n' + content + '\n</style>';
}

const scriptMatch = html.match(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i);
if (!scriptMatch) throw new Error('Bundle JavaScript Vite tidak ditemukan di dist/index.html.');
html = html.replace(scriptMatch[0], await inlineAsset(scriptMatch[1], 'script'));

const cssMatch = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/i);
if (cssMatch) html = html.replace(cssMatch[0], await inlineAsset(cssMatch[1], 'style'));

html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, '');
html = html.replace(/<link[^>]+crossorigin[^>]*>/gi, '');
html = html.replace(/<title>.*?<\/title>/i, '<title>Tata Naskah Dinas - SIT Qudwah</title>');

await fs.mkdir(gasDir, { recursive: true });
await fs.writeFile(path.join(gasDir, 'Index.html'), html, 'utf8');
console.log('Berhasil membuat gas/Index.html dari build React/Vite.');
