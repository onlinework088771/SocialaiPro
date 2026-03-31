import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const buildDir = path.join(root, 'build');
const assetsDir = path.join(buildDir, 'assets');
const tempDir = path.join(root, '.build-temp');
const tempCss = path.join(tempDir, 'app.css');
const entryFile = path.join(tempDir, 'entry.jsx');

fs.rmSync(buildDir, { recursive: true, force: true });
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`npx tailwindcss -i "${path.join(root, 'src', 'index.css')}" -o "${tempCss}" --minify`, {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});

fs.writeFileSync(
  entryFile,
  `import React from "react";
import ReactDOM from "react-dom/client";
import "./app.css";
import App from "../src/App.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
);

await build({
  entryPoints: [entryFile],
  bundle: true,
  splitting: false,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  outfile: path.join(assetsDir, 'app.js'),
  metafile: true,
  logLevel: 'info',
  jsx: 'automatic',
  loader: {
    '.js': 'js',
    '.jsx': 'jsx',
    '.css': 'css',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
    '.gif': 'file',
    '.webp': 'file',
  },
  alias: {
    '@': path.join(root, 'src'),
  },
  define: {
    'process.env.REACT_APP_BACKEND_URL': JSON.stringify(process.env.REACT_APP_BACKEND_URL || ''),
    'process.env.NODE_ENV': '"production"',
  },
  assetNames: 'assets/[name]-[hash]',
  publicPath: '/',
});

const builtCssPath = path.join(assetsDir, 'app.css');
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Social Ai Pro - AI-powered Facebook multi-page publishing suite" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>Social Ai Pro</title>
    ${fs.existsSync(builtCssPath) ? '<link rel="stylesheet" href="/assets/app.css" />' : ''}
  </head>
  <body>
    <div id="root"></div>
    <script src="/assets/app.js"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(buildDir, 'index.html'), html);

const publicDir = path.join(root, 'public');
if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir)) {
    const srcPath = path.join(publicDir, entry);
    const destPath = path.join(buildDir, entry);
    if (entry === 'index.html') continue;
    fs.cpSync(srcPath, destPath, { recursive: true });
  }
}

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('Lightweight production build completed:', buildDir);
