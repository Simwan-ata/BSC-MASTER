import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const htmlPath = path.join(distDir, 'index.html');
let html = await readFile(htmlPath, 'utf8');

// Inline generated CSS so the app can be opened as a single HTML file.
const cssLinks = [...html.matchAll(/<link\\b[^>]*href="([^"]+\\.css)"[^>]*>/g)];
for (const match of cssLinks) {
  const assetPath = path.resolve(distDir, match[1].replace(/^\\//, ''));
  if (!assetPath.startsWith(distDir + path.sep)) throw new Error('Unexpected CSS asset path');
  const css = await readFile(assetPath, 'utf8');
  html = html.replace(match[0], '<style>\\n' + css + '\\n</style>');
}

// Remove module-preload hints and inline the bundled JavaScript.
html = html.replace(/<link\\b[^>]*rel="modulepreload"[^>]*>\\s*/g, '');
const jsScripts = [...html.matchAll(/<script\\b([^>]*)src="([^"]+\\.js)"([^>]*)><\\/script>/g)];
if (jsScripts.length !== 1) {
  throw new Error(`Expected one bundled JavaScript entry, found ${jsScripts.length}. Check code splitting before publishing standalone HTML.`);
}
for (const match of jsScripts) {
  const assetPath = path.resolve(distDir, match[2].replace(/^\\//, ''));
  if (!assetPath.startsWith(distDir + path.sep)) throw new Error('Unexpected JavaScript asset path');
  let js = await readFile(assetPath, 'utf8');
  // Prevent an embedded closing script sequence from terminating the HTML element.
  js = js.replace(/<\\/script/gi, '<\\\\/script');
  html = html.replace(match[0], '<script type="module">\\n' + js + '\\n</script>');
}

const outputPath = path.join(distDir, 'BSC-MASTER-standalone.html');
await writeFile(outputPath, html, 'utf8');
console.log(`Created ${outputPath} (${Buffer.byteLength(html)} bytes)`);
