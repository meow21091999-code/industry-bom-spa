import * as esbuild from 'esbuild'
import fs from 'node:fs'

const BASE = '/industry-bom-spa/'

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020'],
  jsx: 'automatic',
  outdir: 'dist/assets',
  entryNames: 'app',
  assetNames: '[name]',
  loader: { '.json': 'json' },
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'info',
})

fs.writeFileSync('dist/index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Industry BOM Registry</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2" rel="stylesheet" />
    <link rel="stylesheet" href="${BASE}assets/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${BASE}assets/app.js"></script>
  </body>
</html>
`)

// SPA fallback for GitHub Pages (HashRouter does not need it, but harmless)
fs.copyFileSync('dist/index.html', 'dist/404.html')

const js = fs.statSync('dist/assets/app.js').size
const css = fs.statSync('dist/assets/app.css').size
console.log(`built: app.js ${(js/1024).toFixed(0)} KB · app.css ${(css/1024).toFixed(0)} KB`)
