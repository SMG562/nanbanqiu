"""出图 + 自动检查：文字出界 / 被截断 / 压住、二维码解码、OCR 数字核对；另出一张「小红书信息流」缩略对比。
用法：python3 marketing/digest/render.py [timetable:dark timetable:light treasure join]"""
import os, sys, importlib, tempfile, re, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402
from PIL import Image, ImageDraw, ImageOps, ImageStat  # noqa: E402
import zxingcpp  # noqa: E402
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('DIGEST_OUT', '/tmp/digest_out'); os.makedirs(OUT, exist_ok=True)
SVG_CHECK = open(os.path.join(HERE, '..', 'build.py')).read().split("TEXT_CHECK = '''")[1].split("'''")[0].replace('H = 1350', 'H = 1440').replace("querySelectorAll('svg text')", "querySelectorAll('svg text:not([data-fx])')")   # data-fx = 有意叠在正文上的光晕 / 影子层
HTML_CHECK = '''() => { const W = 1080, H = 1440, M = 24, out = [], boxes = [], ctx = document.createElement('canvas').getContext('2d');
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, s = n.textContent.trim(); if (!s || n.parentElement.closest('svg')) continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
    if (b.left < M - 1 || b.right > W - M + 1 || b.top < M - 1 || b.bottom > H - M + 1) out.push(`出边/太靠边：「${s.slice(0, 14)}」`);
    // 按真实笔画上下沿算（字体框比笔画高，大字尤其明显，会误报）
    const cs = getComputedStyle(n.parentElement); ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const m = ctx.measureText(s);
    for (const q of r.getClientRects()) if (q.width > 2) { const top = q.top + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent);
      boxes.push({ s, x: q.left, y: top, r: q.right, b: q.top + m.fontBoundingBoxAscent + m.actualBoundingBoxDescent }) } }
  for (const e of document.querySelectorAll('svg text:not([data-fx])')) { if (e.closest('.art')) continue;   // SVG 里的字也参加「插画压住文字」检查（插画自带的字除外）
    const q = e.getBoundingClientRect(); if (q.width <= 2) continue;
    const cs = getComputedStyle(e), sc = q.height / (parseFloat(cs.fontSize) * 1.0 || 1);   // 按真实墨迹算（全角句号、字间距会让外框比字大）
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.letterSpacing = cs.letterSpacing || '0px'; const m = ctx.measureText((e.textContent || '').trim());
    const top = q.top + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent);
    boxes.push({ s: (e.textContent || '').trim(), x: q.left + Math.max(0, -m.actualBoundingBoxLeft), y: top, r: q.left + m.actualBoundingBoxRight, b: q.top + m.fontBoundingBoxAscent + m.actualBoundingBoxDescent, svg: true }) }
  for (const a of document.querySelectorAll('.art')) { const g = a.getBoundingClientRect();   // 插画（标了 class="art" 的图形）压住文字
    for (const t of boxes) { const w = Math.min(g.right, t.r) - Math.max(g.left, t.x), h = Math.min(g.bottom, t.b) - Math.max(g.top, t.y); if (w > 4 && h > 4) out.push(`图形压住文字：「${t.s.slice(0, 10)}」`) } }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { if (boxes[i].svg || boxes[j].svg) continue;   // SVG 字之间由 SVG_CHECK 查   // HTML 文字互相压住（第一版只查了 SVG，漏过一次）
    const a = boxes[i], c = boxes[j], w = Math.min(a.r, c.r) - Math.max(a.x, c.x), h = Math.min(a.b, c.b) - Math.max(a.y, c.y);
    if (w > 3 && h > 3) out.push(`文字压住：「${a.s.slice(0, 10)}」和「${c.s.slice(0, 10)}」`) }
  for (const e of document.querySelectorAll('body *')) if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow === 'ellipsis') out.push(`被截断：「${e.textContent.trim().slice(0, 14)}」`);
  return out }'''
JOBS = sys.argv[1:] or ['timetable:dark', 'timetable:light', 'treasure', 'join']
ok = True; covers = []
with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium' if os.path.exists('/opt/pw-browsers/chromium') else None)
    pg = b.new_page(viewport={'width': 1080, 'height': 1440}, device_scale_factor=2)
    for job in JOBS:
        name, _, theme = job.partition(':'); mod = importlib.import_module(name)
        doc = mod.html(theme) if theme else (mod.html() if hasattr(mod, 'html') else mod.svg())
        out = name + ('-' + theme.replace('@', '-').replace('+', '-') if theme else '')
        h = os.path.join(tmp, out + '.html'); open(h, 'w').write(doc)
        pg.goto('file://' + h); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        png = os.path.join(OUT, out + '@2x.png'); pg.screenshot(path=png)
        warn = pg.evaluate(HTML_CHECK) + pg.evaluate(SVG_CHECK)
        im = Image.open(png).convert('RGB'); small = im.resize((1080, 1440), Image.LANCZOS)
        jpg = os.path.join(OUT, out + '.jpg'); small.save(jpg, quality=92, subsampling=0)
        im.resize((1440, 1920), Image.LANCZOS).save(os.path.join(OUT, out + '-上传1440.jpg'), quality=92, subsampling=0)   # 小红书上传用：3:4、1440×1920（平台会再压缩一次）
        qrs = [r.text for r in zxingcpp.read_barcodes(im)]
        # 数字核对 ①：页面上实际排出的文字里，必须有这些（逐字）
        norm = lambda s: re.sub(r'[^0-9A-Za-z\u4e00-\u9fff]', '', s)
        dom = norm(pg.evaluate('document.body.textContent'))
        miss = [e for e in (mod.EXPECT() if hasattr(mod, 'EXPECT') else []) if norm(e) not in dom]
        # 数字核对 ②：标题里的关键数字截出来 OCR，确认图上看得清（不是只在代码里对）
        if hasattr(mod, 'HEADLINE'):
            num, sel = mod.HEADLINE()
            bb = pg.evaluate(f'(() => {{ const r = document.querySelector("{sel}").getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] }})()')
            box = (int(bb[0]) - 8, int(bb[1]) + 4, int(bb[2]) + 8, int(bb[3]) - 4)
            g = ImageOps.autocontrast(small.crop(box).convert('L'))
            if ImageStat.Stat(g).mean[0] < 128: g = ImageOps.invert(g)
            g = g.point(lambda v: 255 if v > 150 else 0); cp = os.path.join(tmp, out + '_head.png'); g.save(cp)
            seen = subprocess.run(['tesseract', cp, '-', '--psm', '7', '-c', 'tessedit_char_whitelist=0123456789'], capture_output=True, text=True).stdout.strip()
            if seen.replace(' ', '') != num: miss.append(f'标题数字 OCR 读成「{seen}」，应为 {num}')
        bad = warn or miss or any(not q.startswith('https://nanbanqiu.app/') for q in qrs)
        ok &= not bad
        print(f'{"✗" if bad else "✓"} {out:16} 文字:{warn or "无问题"} | 二维码:{qrs or "无"} | 数字核对:{miss or "通过"}')
        covers.append((out, small))
    b.close()
# 小红书双列信息流里约 540 宽：把每张缩到那么大放在一起比
sheet = Image.new('RGB', (40 + 560 * len(covers), 800), '#FFFFFF'); d = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(covers): sheet.paste(im.resize((540, 720), Image.LANCZOS), (20 + 560 * i, 20)); d.text((20 + 560 * i, 760), n, fill='#666')
sheet.save(os.path.join(OUT, '_feed.jpg'), quality=88)
sys.exit(0 if ok else 1)
