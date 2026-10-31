import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const resources = path.join(appRoot, 'resources')
const artifacts = path.join(appRoot, '.artifacts')
const logo = `data:image/png;base64,${fs.readFileSync(path.join(resources, 'icon.png')).toString('base64')}`

const baseStyle = `
  * { box-sizing: border-box; }
  html, body { margin: 0; overflow: hidden; background: #0c0c0e; }
  body { font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .art {
    position: relative; width: 164px; height: 314px; overflow: hidden;
    background:
      radial-gradient(150px 110px at 88% -6%, rgba(186, 240, 105, 0.19), transparent 68%),
      radial-gradient(220px 160px at -30% 108%, rgba(186, 240, 105, 0.05), transparent 60%),
      linear-gradient(158deg, #1d1d21 0%, #141416 48%, #0a0a0c 100%);
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.026) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px);
    background-size: 22px 22px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.9), transparent 70%);
  }
  .head { position: absolute; left: 20px; top: 20px; display: flex; align-items: center; gap: 10px; }
  .tile {
    width: 34px; height: 34px; border-radius: 10px; overflow: hidden; flex: none;
    box-shadow: 0 10px 22px -10px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  .tile img { width: 100%; height: 100%; display: block; }
  .brand { font-size: 14.5px; font-weight: 600; color: #f2f2f4; letter-spacing: 0.1px; }
  .copy { position: absolute; left: 20px; top: 92px; }
  .copy h1 {
    margin: 0; font-size: 21px; line-height: 1.18; font-weight: 600;
    letter-spacing: -0.35px; color: #f4f4f6;
  }
  .copy h1 em { font-style: normal; color: #c9f27e; }
  .copy p {
    margin: 10px 0 0; font-size: 9.5px; line-height: 1.55;
    color: rgba(255, 255, 255, 0.42); max-width: 122px;
  }
  .rule {
    width: 26px; height: 2px; border-radius: 2px; background: #c9f27e;
    margin-top: 17px; box-shadow: 0 0 12px rgba(201, 242, 126, 0.5);
  }
  .sep {
    position: absolute; left: 20px; right: 16px; bottom: 78px; height: 1px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), transparent);
  }
  .feat {
    position: absolute; left: 20px; right: 16px; bottom: 18px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .feat div {
    display: flex; align-items: center; gap: 7px;
    font-size: 8.5px; letter-spacing: 0.15px; color: rgba(255, 255, 255, 0.5);
  }
  .feat i {
    width: 4px; height: 4px; border-radius: 50%; flex: none; background: #c9f27e;
    box-shadow: 0 0 6px rgba(201, 242, 126, 0.6);
  }
`

function sidebarHtml({ headline, accent, body, features }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body><div class="art"><div class="grid"></div>
  <div class="head"><span class="tile"><img src="${logo}"></span><span class="brand">CloseCode</span></div>
  <div class="copy">
    <h1>${headline}<br><em>${accent}</em></h1>
    <p>${body}</p>
    <div class="rule"></div>
  </div>
  <div class="sep"></div>
  <div class="feat">${features.map((feature) => `<div><i></i>${feature}</div>`).join('')}</div>
</div></body></html>`
}

const headerHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 150px; height: 57px; overflow: hidden; background: #121214; }
  body { font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .hd {
    position: relative; width: 150px; height: 57px; display: flex; align-items: center; gap: 9px; padding: 0 12px;
    background:
      radial-gradient(120px 80px at 104% -34%, rgba(201, 242, 126, 0.2), transparent 72%),
      linear-gradient(160deg, #1c1c20 0%, #121214 55%, #0e0e10 100%);
  }
  .hd::before {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 12px 12px;
    mask-image: linear-gradient(100deg, transparent 6%, rgba(0, 0, 0, 0.85) 62%, transparent 100%);
  }
  .hd::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
    background: linear-gradient(90deg, rgba(201, 242, 126, 0.28), rgba(255, 255, 255, 0.05) 46%, transparent);
  }
  .tile {
    position: relative; width: 27px; height: 27px; border-radius: 8px; overflow: hidden; flex: none;
    box-shadow: 0 6px 14px -6px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .tile img { width: 100%; height: 100%; display: block; }
  .txt { position: relative; display: flex; flex-direction: column; gap: 3px; }
  .txt strong { font-size: 12px; font-weight: 600; color: #f2f2f4; letter-spacing: 0.1px; line-height: 1; }
  .txt small {
    display: flex; align-items: center; gap: 4px;
    font-family: "Cascadia Mono", "Consolas", monospace;
    font-size: 6.5px; font-weight: 600; letter-spacing: 0.9px; color: rgba(201, 242, 126, 0.82); line-height: 1;
  }
  .caret { width: 4px; height: 7px; background: rgba(201, 242, 126, 0.75); border-radius: 1px; animation: none; }
</style></head>
<body><div class="hd">
  <span class="tile"><img src="${logo}"></span>
  <span class="txt"><strong>CloseCode</strong><small><span>&gt;_</span> DESKTOP AGENT<span class="caret"></span></small></span>
</div></body></html>`

const scenes = [
  {
    file: 'installerSidebar.bmp',
    preview: 'installer-sidebar.png',
    width: 164,
    height: 314,
    html: sidebarHtml({
      headline: 'your code.',
      accent: 'your agent.',
      body: 'Your own API keys, local files and no middlemen.',
      features: ['keys encrypted on device', 'files stay on your PC', 'direct provider calls']
    })
  },
  {
    file: 'uninstallerSidebar.bmp',
    preview: 'uninstaller-sidebar.png',
    width: 164,
    height: 314,
    html: sidebarHtml({
      headline: 'your files.',
      accent: 'stay yours.',
      body: 'Only CloseCode is removed. Projects, settings and keys stay on this PC.',
      features: ['projects untouched', 'settings kept', 'reinstall anytime']
    })
  },
  {
    file: 'installerHeader.bmp',
    preview: 'installer-header.png',
    width: 150,
    height: 57,
    html: headerHtml
  }
]

function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (bitDepth !== 8 || interlace !== 0 || !channels) {
    throw new Error(`unsupported PNG: depth ${bitDepth}, color ${colorType}, interlace ${interlace}`)
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rgba = Buffer.alloc(width * height * 4)
  let previous = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const current = Buffer.alloc(stride)
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? current[x - channels] : 0
      const b = previous[x]
      const c = x >= channels ? previous[x - channels] : 0
      let value = line[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) {
        throw new Error(`bad PNG filter ${filter}`)
      }
      current[x] = value & 0xff
    }
    for (let x = 0; x < width; x += 1) {
      const source = x * channels
      const target = (y * width + x) * 4
      rgba[target] = current[source]
      rgba[target + 1] = current[source + 1]
      rgba[target + 2] = current[source + 2]
      rgba[target + 3] = channels === 4 ? current[source + 3] : 255
    }
    previous = current
  }
  return { width, height, rgba }
}

function writeBmp({ width, height, rgba }, file) {
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixels = rowSize * height
  const buffer = Buffer.alloc(54 + pixels)
  buffer.write('BM', 0)
  buffer.writeUInt32LE(54 + pixels, 2)
  buffer.writeUInt32LE(54, 10)
  buffer.writeUInt32LE(40, 14)
  buffer.writeInt32LE(width, 18)
  buffer.writeInt32LE(height, 22)
  buffer.writeUInt16LE(1, 26)
  buffer.writeUInt16LE(24, 28)
  buffer.writeUInt32LE(pixels, 34)
  buffer.writeInt32LE(2835, 38)
  buffer.writeInt32LE(2835, 42)
  for (let y = 0; y < height; y += 1) {
    const sourceY = height - 1 - y
    const row = 54 + y * rowSize
    for (let x = 0; x < width; x += 1) {
      const source = (sourceY * width + x) * 4
      const target = row + x * 3
      buffer[target] = rgba[source + 2]
      buffer[target + 1] = rgba[source + 1]
      buffer[target + 2] = rgba[source]
    }
  }
  fs.writeFileSync(file, buffer)
}

fs.mkdirSync(artifacts, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const scene of scenes) {
    const page = await browser.newPage({
      viewport: { width: scene.width, height: scene.height },
      deviceScaleFactor: 1
    })
    await page.setContent(scene.html)
    await page.evaluate(() => document.fonts.ready)
    const png = await page.screenshot({ type: 'png' })
    const image = decodePng(png)
    if (image.width !== scene.width || image.height !== scene.height) {
      throw new Error(`${scene.file}: expected ${scene.width}x${scene.height}, got ${image.width}x${image.height}`)
    }
    writeBmp(image, path.join(resources, scene.file))
    fs.writeFileSync(path.join(artifacts, scene.preview), png)
    console.log(`✓ ${scene.file} (${scene.width}x${scene.height})`)
    await page.close()
  }
} finally {
  await browser.close()
}
