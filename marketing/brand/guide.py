"""生成南伴球标志规范页：python3 marketing/brand/guide.py → marketing/brand/guide.html
所有图形来自 logo.py 的同一套几何，页面上的每个数字都由常量算出来。"""
import os, math
import logo as L

C = L.COL


def contrast(a, b):
    def lum(h):
        r, g, b_ = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
        f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
        return .2126 * f(r) + .7152 * f(g) + .0722 * f(b_)
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + .05) / (lb + .05)


def svg(body, w, h, pad=0, bg=None, cls='', style=''):
    W, H = w + 2 * pad, h + 2 * pad
    bgr = f'<rect x="{-pad:.1f}" y="{-pad:.1f}" width="{W:.1f}" height="{H:.1f}" fill="{bg}"/>' if bg else ''
    return (f'<svg class="{cls}" style="{style}" viewBox="{-pad:.1f} {-pad:.1f} {W:.1f} {H:.1f}" '
            f'xmlns="http://www.w3.org/2000/svg" role="img">{bgr}{body}</svg>')


def tile(lock, v, pad_x=1.0, extra=''):
    """lock(ink, ball) → 带底色的展示块，四周留 pad_x 个 x 模块。"""
    c = L.VERSIONS[v]
    b, w, h = lock(c['ink'], c['ball'])
    return b, w, h, c


# ───────────────── 1. 构成图 ─────────────────
def construction():
    (bx, by, br), (sx, sy, sr) = L.BIG, L.SMALL
    d = math.hypot(sx - bx, sy - by)
    ang = math.degrees(math.atan2(sy - by, sx - bx))
    g = ''
    for i in range(0, 101, 10):
        g += f'<line x1="{i}" y1="0" x2="{i}" y2="100" class="gr"/><line x1="0" y1="{i}" x2="100" y2="{i}" class="gr"/>'
    body = f'''<rect width="100" height="100" class="gbg"/>{g}
<g class="mkc">{L.mark(L.BOX[0], L.BOX[1], L.BOX_H, 'currentColor')}</g>
<circle cx="{bx}" cy="{by}" r="{br}" class="ln"/><circle cx="{sx}" cy="{sy}" r="{sr}" class="ln"/>
<circle cx="{sx}" cy="{sy}" r="{sr + L.GAP}" class="ln dash"/>
<line x1="{bx}" y1="{by}" x2="{sx}" y2="{sy}" class="ln acc"/>
<circle cx="{bx}" cy="{by}" r=".9" class="dot"/><circle cx="{sx}" cy="{sy}" r=".9" class="dot"/>
<rect x="{L.BOX[0]}" y="{L.BOX[1]}" width="{L.BOX_W}" height="{L.BOX_H}" class="ln dash"/>
<line x1="{bx}" y1="{by}" x2="{bx - br}" y2="{by}" class="ln acc"/>
<text x="{bx - br/2}" y="{by - 1.6}" class="lab" text-anchor="middle">r₁ 26</text>
<line x1="{sx}" y1="{sy}" x2="{sx + sr}" y2="{sy}" class="ln acc"/>
<text x="{sx + sr/2}" y="{sy - 1.6}" class="lab" text-anchor="middle">r₂ 16.5</text>
<text x="{(bx+sx)/2 + 2.5}" y="{(by+sy)/2 - 1.5}" class="lab">d {d:.1f}</text>
<text x="{L.BOX[0]}" y="{L.BOX[1] - 2}" class="lab">外框 {L.BOX_W:.1f} × {L.BOX_H:.1f}</text>
<text x="{sx + sr + L.GAP + 1}" y="{sy + sr + 1}" class="lab">留白环 {L.GAP}</text>'''
    facts = [
        ('大球 r₁', '26', '网格 100 单位，与 App 图标同一套坐标'),
        ('小球 r₂', '16.5', f'r₂ / r₁ = {sr/br:.3f}，接近黄金比 0.618，大小有别又不悬殊'),
        ('圆心距 d', f'{d:.1f}', f'连线 {ang:.0f}°，接近 45° 对角，视线从左上落到右下'),
        ('留白环', f'{L.GAP}', f'约 r₁ / 8；小球“切”进大球，两人挨着、各有空间'),
        ('球缝', f'−22° / +28°', f'线宽 0.14 r；两球转向相反，像一来一回的击球'),
        ('模块 x', f'{L.X_UNIT:.0f}', '= 小球直径；安全区、间距都用它量'),
    ]
    return svg(body, 100, 100, pad=4, cls='cons'), facts


# ───────────────── 2. 组合规格图（带标注） ─────────────────
def spec_h():
    c = L.VERSIONS['dark']
    b, w, h = L.lockup_h(c['ink'], c['ball'])
    m = L.zh_metrics(100, L.TRACK['h'])
    mh = m['h'] * 1.25
    s = mh / L.BOX_H
    mw = L.BOX_W * s
    x = L.X_UNIT * s
    gx = .75 * x
    ann = f'''<g class="an">
<line x1="{mw}" y1="{h + 14}" x2="{mw + gx}" y2="{h + 14}"/><text x="{mw + gx/2}" y="{h + 30}" text-anchor="middle">0.75x</text>
<line x1="-14" y1="0" x2="-14" y2="{h}"/><text x="-20" y="{h/2 + 5}" text-anchor="end">1.25 h</text>
<line x1="{w + 14}" y1="{(h - m['h'])/2}" x2="{w + 14}" y2="{(h + m['h'])/2}"/><text x="{w + 20}" y="{h/2 + 5}">h 字高</text>
</g>'''
    return svg(b + ann, w, h, pad=0, cls='spec', style='overflow:visible')


def spec_v():
    c = L.VERSIONS['dark']
    b, w, h = L.lockup_v(c['ink'], c['ball'])
    m = L.zh_metrics(100, L.TRACK['v'])
    mh = m['h'] * 1.9
    gap = m['h'] * .55
    ann = f'''<g class="an">
<line x1="{w + 14}" y1="0" x2="{w + 14}" y2="{mh}"/><text x="{w + 20}" y="{mh/2 + 5}">1.9 h</text>
<line x1="{w + 14}" y1="{mh}" x2="{w + 14}" y2="{mh + gap}"/><text x="{w + 20}" y="{mh + gap/2 + 5}">0.55 h</text>
<line x1="{w + 14}" y1="{mh + gap}" x2="{w + 14}" y2="{mh + gap + m['h']}"/><text x="{w + 20}" y="{mh + gap + m['h']/2 + 5}">h</text>
<line x1="0" y1="{h + 14}" x2="{w}" y2="{h + 14}"/><text x="{w/2}" y="{h + 32}" text-anchor="middle">英文与中文同宽</text>
</g>'''
    return svg(b + ann, w, h, pad=0, cls='spec', style='overflow:visible')


def spec_sig():
    c = L.VERSIONS['dark']
    b, w, h = L.lockup_sig(c['ink'], c['ball'])
    m = L.zh_metrics(100, L.TRACK['sig'])
    mh = m['h'] * .55
    gl = L.ZH['glyphs']
    seam = (m['adv'] + gl['伴']['bounds'][2] / 10 + 2 * m['adv'] + gl['球']['bounds'][0] / 10) / 2 - m['left']
    ann = f'''<g class="an">
<line x1="{seam}" y1="-14" x2="{seam}" y2="{h + 8}" stroke-dasharray="4 4"/><text x="{seam}" y="-22" text-anchor="middle">「伴」「球」字缝</text>
<line x1="-14" y1="0" x2="-14" y2="{mh}"/><text x="-20" y="{mh/2 + 5}" text-anchor="end">0.55 h</text>
<line x1="-14" y1="{mh + m['h']*.12}" x2="-14" y2="{h}"/><text x="-20" y="{mh + m['h']*.12 + m['h']/2 + 5}" text-anchor="end">h</text>
<text x="{w/2}" y="{h + 34}" text-anchor="middle">字距 0.32 em</text>
</g>'''
    return svg(b + ann, w, h, pad=0, cls='spec', style='overflow:visible')


# ───────────────── 3. 安全区 ─────────────────
def clearspace(lock, track_key, mh_ratio, label):
    c = L.VERSIONS['light']
    b, w, h = lock(c['ink'], c['ball'])
    m = L.zh_metrics(100, L.TRACK[track_key])
    x = L.X_UNIT * (m['h'] * mh_ratio) / L.BOX_H
    xs = ''
    for cx, cy in ((-x, -x), (w, -x), (-x, h), (w, h)):
        xs += f'<rect x="{cx:.1f}" y="{cy:.1f}" width="{x:.1f}" height="{x:.1f}" class="xm"/><text x="{cx + x/2:.1f}" y="{cy + x/2 + 6:.1f}" text-anchor="middle" class="xt">x</text>'
    body = (f'<rect x="{-x:.1f}" y="{-x:.1f}" width="{w + 2*x:.1f}" height="{h + 2*x:.1f}" class="cz"/>'
            f'<rect x="0" y="0" width="{w:.1f}" height="{h:.1f}" class="cb"/>{xs}{b}')
    return svg(body, w, h, pad=x + 6, cls='cs')


# ───────────────── 4. 最小尺寸 ─────────────────
MINS = [
    ('符号（带球缝）', 'mark', '≥ 24 px / 6 mm'),
    ('符号（简化，无球缝）', 'simple', '12–23 px / 3–6 mm，网站图标、地图点'),
    ('横式', 'h', '宽 ≥ 96 px / 25 mm'),
    ('竖式', 'v', '宽 ≥ 72 px / 20 mm；英文行宽 < 120 px 时去掉英文'),
    ('签名式', 'sig', '宽 ≥ 120 px / 30 mm'),
]


def minsize(kind):
    c = L.VERSIONS['dark']
    if kind == 'mark':
        b, w, h = L.mark_only(c['ball'])
        px = 24
    elif kind == 'simple':
        b, w, h = L.mark_only(c['ball'], seams=False)
        px = 14
    elif kind == 'h':
        b, w, h = L.lockup_h(c['ink'], c['ball']); px = 96
    elif kind == 'v':
        b, w, h = L.lockup_v(c['ink'], c['ball'], sub=False); px = 72
    else:
        b, w, h = L.lockup_sig(c['ink'], c['ball']); px = 120
    return f'<span class="ms" style="width:{px}px">{svg(b, w, h)}</span>'


# ───────────────── 5. 禁用 ─────────────────
def donts():
    d = L.VERSIONS['dark']
    b, w, h = L.lockup_h(d['ink'], d['ball'])
    m = L.zh_metrics(100, L.TRACK['h'])
    mw = L.BOX_W * h / L.BOX_H
    gap = .75 * L.X_UNIT * h / L.BOX_H
    base = (h - m['h']) / 2 - m['top']
    items = [
        ('拉伸或压扁', svg(f'<g transform="scale(1.35 .7)">{b}</g>', w * 1.35, h * .7, pad=30, bg=C['deep'])),
        ('旋转', svg(f'<g transform="rotate(-12 {w/2} {h/2})">{b}</g>', w, h, pad=60, bg=C['deep'])),
        ('浅底上用黄绿球（看不见）', svg(L.lockup_h(C['deep'], C['lime'])[0], w, h, pad=30, bg=C['cream'])),
        ('换成品牌外的颜色', svg(L.lockup_h(d['ink'], '#E8643C')[0], w, h, pad=30, bg=C['deep'])),
        ('加描边、投影、渐变、立体', svg(f'<defs><filter id="ds"><feDropShadow dx="6" dy="8" stdDeviation="4" flood-color="#000" flood-opacity=".7"/></filter></defs><g filter="url(#ds)" stroke="#C6EA3D" stroke-width="3">{b}</g>', w, h, pad=30, bg=C['deep'])),
        ('调换大小球的位置', svg(f'<g transform="rotate(180 {mw/2:.1f} {h/2:.1f})">{L.mark(0, 0, h, d["ball"])}</g>' + L.wordmark(mw + gap, base, 100, L.TRACK['h'], d['ink']), w, h, pad=30, bg=C['deep'])),
        ('用别的字体重打', svg(f'{L.mark(0, 0, h, d["ball"])}<text x="{w*0.36}" y="{h*0.78}" font-family="Noto Serif SC,serif" font-weight="900" font-size="96" fill="#fff">南伴球</text>', w + 40, h, pad=30, bg=C['deep'])),
        ('放在杂乱的背景上', svg(f'<defs><pattern id="busy" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#5f8f3a"/><circle cx="10" cy="10" r="14" fill="#C6EA3D"/><rect x="22" y="18" width="20" height="24" fill="#F7EBD6"/></pattern></defs><rect x="-30" y="-30" width="{w+60}" height="{h+60}" fill="url(#busy)"/>{b}', w, h, pad=30)),
    ]
    return items


# ───────────────── 6. 应用示例 ─────────────────
def poster_mock():
    c = L.VERSIONS['dark']
    b, w, h = L.lockup_sig(c['ink'], c['ball'])
    tw = 240
    s = tw / w
    th = h * s
    y = 1290 - th
    # 画布上的辅助线：落款宽度、底边距
    return svg(f'''<defs><radialGradient id="pbg" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="#155C42"/><stop offset="1" stop-color="#04120C"/></radialGradient></defs>
<rect width="1080" height="1350" fill="url(#pbg)"/>
<text x="84" y="150" font-family="Inter,sans-serif" font-size="17" font-weight="500" letter-spacing="9" fill="#F7EBD6" opacity=".7">TONIGHT</text>
<line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
<text x="80" y="290" font-family="'Noto Serif SC',serif" font-weight="700" font-size="62" fill="#F7EBD6" letter-spacing="4">今晚，</text>
<text x="80" y="370" font-family="'Noto Serif SC',serif" font-weight="700" font-size="62" fill="#C6EA3D" letter-spacing="4">有人在打球。</text>
<circle cx="540" cy="800" r="170" fill="#C6EA3D"/><circle cx="540" cy="800" r="170" fill="none" stroke="#0B3B2A" stroke-opacity=".12" stroke-width="2"/>
<g transform="translate({540 - tw/2:.1f} {y:.1f}) scale({s:.4f})">{b}</g>
<g class="pg"><line x1="{540-tw/2}" y1="1318" x2="{540+tw/2}" y2="1318"/><text x="540" y="1340" text-anchor="middle">240 px（画布宽 22%）</text>
<line x1="{540+tw/2+24}" y1="1290" x2="{540+tw/2+24}" y2="1350"/><text x="{540+tw/2+32}" y="1326">60</text></g>''', 1080, 1350, cls='mock-p')


def app_mock():
    c = L.VERSIONS['dark']
    b, w, h = L.lockup_h(c['ink'], c['ball'])
    s = 26 / h
    return svg(f'''<rect width="390" height="230" rx="28" fill="#F3EFE6"/>
<path d="M0 28 a28 28 0 0 1 28 -28 h334 a28 28 0 0 1 28 28 v62 h-390z" fill="{C['deep']}"/>
<g transform="translate(20 46) scale({s:.4f})">{b}</g>
<circle cx="356" cy="59" r="15" fill="#fff" fill-opacity=".12"/>
<rect x="20" y="112" width="350" height="44" rx="12" fill="#fff"/><rect x="20" y="166" width="350" height="44" rx="12" fill="#fff"/>
<rect x="36" y="128" width="120" height="12" rx="6" fill="#0B3B2A" fill-opacity=".14"/><rect x="36" y="182" width="90" height="12" rx="6" fill="#0B3B2A" fill-opacity=".14"/>''', 390, 230, cls='mock-a')


def avatar_mock():
    c = L.VERSIONS['dark']
    out = ''
    for i, (bg, ball) in enumerate(((C['deep'], C['lime']), (C['lime'], C['deep']), (C['cream'], C['deep']))):
        cx = 70 + i * 150
        mh = 120 * .52
        mw = L.BOX_W * mh / L.BOX_H
        out += f'<circle cx="{cx}" cy="70" r="60" fill="{bg}"/>' + L.mark(cx - mw / 2, 70 - mh / 2, mh, ball)
    return svg(out, 440, 140, cls='mock-v')


def card_mock():
    c = L.VERSIONS['light']
    b, w, h = L.lockup_v(c['ink'], c['ball'])
    d = L.VERSIONS['dark']
    b2, w2, h2 = L.mark_only(d['ball'])
    s = 120 / w
    return svg(f'''<rect width="340" height="200" fill="{C['cream']}"/>
<g transform="translate({170 - 60} {100 - h*s/2:.1f}) scale({s:.4f})">{b}</g>
<rect x="360" width="340" height="200" fill="{C['deep']}"/>
<g transform="translate(386 26) scale({40/h2:.4f})">{b2}</g>
<text x="386" y="150" font-family="'Noto Sans SC',sans-serif" font-size="15" font-weight="700" fill="#fff">墨尔本网球约局</text>
<text x="386" y="172" font-family="Inter,sans-serif" font-size="10" letter-spacing="2" fill="#fff" fill-opacity=".6">NANBANQIU · MELBOURNE</text>''', 700, 200, cls='mock-c')


# ───────────────── 页面 ─────────────────
def page():
    cons, facts = construction()
    dk, lt = L.VERSIONS['dark'], L.VERSIONS['light']
    hero_b, hw, hh = L.lockup_v(dk['ink'], dk['ball'])
    fam = [
        ('横式', 'Horizontal', 'App 顶栏、网页导航、文件抬头、横幅。日常使用的主力。', L.lockup_h),
        ('横式 · 双行', 'Horizontal + EN', '需要英文名的场合：对外合作、名片背面、英文页面。', lambda i, b: L.lockup_h(i, b, sub=True)),
        ('竖式', 'Stacked', '启动页、海报封面、周边、正方形 / 竖长空间。最有仪式感。', L.lockup_v),
        ('签名式', 'Signature', '正式海报、公告、合作物料的落款。日常海报默认用衍生的「点式签名」（两颗纯色球分开）。', L.lockup_sig),
        ('字标', 'Wordmark', '空间极窄、或符号已经在旁边出现过时。', lambda i, b: L.wordmark_only(i)),
        ('符号', 'Mark', 'App 图标、头像、网站图标、球拍贴、地图点。', lambda i, b: L.mark_only(b)),
    ]
    fam_html = ''
    for zh, en, use, fn in fam:
        b, w, h = fn(dk['ink'], dk['ball'])
        fam_html += f'''<figure class="fam"><div class="fam-art">{svg(b, w, h)}</div>
<figcaption><b>{zh}</b><span class="en">{en}</span><p>{use}</p></figcaption></figure>'''

    ver_html = ''
    for k, v in L.VERSIONS.items():
        b, w, h = L.lockup_h(v['ink'], v['ball'])
        cr = contrast(v['bg'], v['ink'])
        cb = contrast(v['bg'], v['ball'])
        ver_html += f'''<figure class="ver"><div class="ver-art" style="background:{v['bg']}">{svg(b, w, h)}</div>
<figcaption><b>{v['name']}</b><span class="num">底 {v['bg']} · 字 {v['ink']} · 球 {v['ball']}</span><span class="num">对比度：字 {cr:.1f} : 1 · 球 {cb:.1f} : 1</span></figcaption></figure>'''

    pal = [
        ('深绿 Deep', 'deep', '主底色、浅底上的字和球', '11 59 42'),
        ('球场绿 Green', 'green', '辅助底色、按钮', '23 107 77'),
        ('荧光黄绿 Lime', 'lime', '球、唯一的强调色；只放深底上', '198 234 61'),
        ('奶油 Cream', 'cream', '浅色底、深底上的次要文字', '247 235 214'),
        ('纸色 Paper', 'paper', '海报纸感底', '243 230 204'),
    ]
    pal_html = ''.join(f'''<div class="sw"><div class="chip" style="background:{C[k]}"></div><b>{n}</b>
<span class="num">{C[k]}</span><span class="num">RGB {rgb}</span><p>{u}</p></div>''' for n, k, u, rgb in pal)

    mins_html = ''.join(f'<div class="mn"><div class="mn-art">{minsize(k)}</div><b>{n}</b><span>{t}</span></div>' for n, k, t in MINS)
    dont_html = ''.join(f'<figure class="dn"><div class="dn-art">{s}</div><figcaption><i aria-hidden="true">×</i>{t}</figcaption></figure>' for t, s in donts())
    facts_html = ''.join(f'<tr><th>{a}</th><td class="num">{b}</td><td>{c}</td></tr>' for a, b, c in facts)

    lc = contrast(C['deep'], C['lime'])
    return f'''<title>南伴球标志规范</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@700;900&display=swap">
<style>
/* 版式：品牌手册式的单栏长页；左侧章节号是真的阅读顺序（先懂符号，再学组合，再看用法） */
:root{{
  --bg:#F6F3EA; --surface:#FFFFFF; --fg:#0B3B2A; --muted:#55685F; --rule:#D9D4C4; --accent:#176B4D; --warn:#B4381F;
  --mk:#0B3B2A; --grid:#E6E1D2;
  --f-zh:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
  --f-disp:'Noto Serif SC','Songti SC',serif;
  --f-lat:Inter,'Helvetica Neue',Arial,sans-serif;
}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#07150F;--surface:#0E2219;--fg:#EEF2E6;--muted:#9DB2A6;--rule:#21392E;--accent:#C6EA3D;--warn:#F08A6C;--mk:#C6EA3D;--grid:#163126;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#07150F;--surface:#0E2219;--fg:#EEF2E6;--muted:#9DB2A6;--rule:#21392E;--accent:#C6EA3D;--warn:#F08A6C;--mk:#C6EA3D;--grid:#163126;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--fg);font:15px/1.75 var(--f-zh);-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1080px;margin:0 auto;padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}}
.hero{{background:#0B3B2A;color:#fff}}
.hero .wrap{{padding-block:72px 56px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:48px;align-items:center}}
.hero-art svg{{width:min(100%,300px);display:block;margin:0 auto}}
.eyebrow{{font:600 12px/1 var(--f-lat);letter-spacing:.28em;text-transform:uppercase;color:#C6EA3D}}
.hero h1{{font:900 clamp(34px,5vw,54px)/1.15 var(--f-disp);margin:18px 0 18px;text-wrap:balance}}
.hero p{{color:#D6E2D9;max-width:34em;margin:0}}
.hero .meta{{margin-top:26px;font:500 12px/1.6 var(--f-lat);letter-spacing:.12em;color:#9FBCAD}}
section{{border-top:1px solid var(--rule)}}
section .wrap{{padding-block:64px;display:grid;grid-template-columns:200px minmax(0,1fr);gap:40px}}
.sh .no{{font:600 12px/1 var(--f-lat);letter-spacing:.2em;color:var(--accent)}}
.sh h2{{font:900 26px/1.3 var(--f-disp);margin:10px 0 8px;text-wrap:balance}}
.sh .en{{font:500 11px/1 var(--f-lat);letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}}
.body{{min-width:0;display:grid;gap:28px}}
.lead{{font-size:17px;max-width:38em;margin:0}}
p{{margin:0}}
.num{{font-family:var(--f-lat);font-variant-numeric:tabular-nums}}
.rules{{margin:0;padding-left:1.2em;display:grid;gap:6px;max-width:42em}}
.rules b{{color:var(--accent)}}
/* 理念 */
.idea{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}}
.idea div{{border-top:2px solid var(--fg);padding-top:14px}}
.idea b{{font:700 17px/1.4 var(--f-zh);display:block;margin-bottom:6px}}
.idea p{{color:var(--muted);font-size:14px}}
/* 构成 */
.cons-grid{{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:start}}
svg.cons{{width:100%;max-width:440px;background:var(--surface);border:1px solid var(--rule)}}
.cons .gbg{{fill:var(--surface)}} .cons .mkc{{color:var(--mk);opacity:.9}} .cons .gr{{stroke:var(--grid);stroke-width:.2}}
.cons .ln{{fill:none;stroke:var(--fg);stroke-width:.25;opacity:.7}} .cons .dash{{stroke-dasharray:1 1}}
.cons .acc{{stroke:var(--warn);opacity:1;stroke-width:.35}} .cons .dot{{fill:var(--warn)}}
.cons .lab{{font:600 2.6px var(--f-lat);fill:var(--warn)}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
th,td{{text-align:left;vertical-align:top;padding:9px 10px 9px 0;border-bottom:1px solid var(--rule)}}
th{{font-weight:700;white-space:nowrap}} td.num{{white-space:nowrap;color:var(--accent);font-weight:600}}
/* 家族 */
.fams{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
.fam{{margin:0;background:var(--surface);border:1px solid var(--rule)}}
.fam-art{{background:#0B3B2A;height:200px;display:flex;align-items:center;justify-content:center;padding:36px}}
.fam-art svg{{max-width:100%;max-height:100%;width:auto;height:auto}}
.fam figcaption{{padding:16px 18px 18px}}
.fam b{{font-size:16px}} .fam .en,.ver .en{{margin-left:10px;font:500 11px var(--f-lat);letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}}
.fam p{{color:var(--muted);font-size:14px;margin-top:4px}}
/* 规格 */
.specs{{display:grid;gap:22px}}
.spec-row{{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:28px;align-items:center;background:var(--surface);border:1px solid var(--rule);padding:30px}}
.spec-art{{background:#0B3B2A;padding:56px 70px 64px;display:flex;justify-content:center;overflow:hidden}}
svg.spec{{width:100%;max-height:260px;overflow:visible}}
.spec .an line{{stroke:#F08A6C;stroke-width:1.6}} .spec .an text{{font:600 15px var(--f-lat);fill:#F08A6C}}
.spec-row h3{{font:700 18px/1.3 var(--f-zh);margin:0 0 8px}}
.spec-row ul{{margin:0;padding-left:1.1em;color:var(--muted);font-size:14px;display:grid;gap:4px}}
/* 安全区 */
.css{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
.css figure{{margin:0;background:var(--surface);border:1px solid var(--rule);padding:18px;display:grid;gap:10px}}
.css figcaption{{font-size:13px;color:var(--muted)}}
svg.cs{{width:100%;height:150px;background:#F7EBD6}}
.cs .cz{{fill:#C6EA3D;fill-opacity:.25;stroke:#176B4D;stroke-dasharray:6 5;stroke-width:1.5}}
.cs .cb{{fill:none;stroke:#176B4D;stroke-width:1}} .cs .xm{{fill:#176B4D;fill-opacity:.18}}
.cs .xt{{font:600 17px var(--f-lat);fill:#0B3B2A}}
/* 配色版本 */
.vers{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
.ver{{margin:0;border:1px solid var(--rule);background:var(--surface)}}
.ver-art{{height:150px;display:flex;align-items:center;justify-content:center;padding:34px}}
.ver-art svg{{max-height:100%;max-width:100%}}
.ver figcaption{{padding:14px 16px;display:grid;gap:2px;font-size:14px}}
.ver .num{{font-size:12px;color:var(--muted)}}
.vers .ver:first-child{{grid-column:1/-1}} .vers .ver:first-child .ver-art{{height:210px}}
/* 色板 */
.pal{{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}}
.sw{{display:grid;gap:2px;font-size:13px}} .sw .chip{{height:96px;border:1px solid var(--rule);margin-bottom:8px}}
.sw .num{{color:var(--muted);font-size:12px}} .sw p{{color:var(--muted);font-size:12px;margin-top:4px}}
.ratio{{display:flex;height:16px;border:1px solid var(--rule)}} .ratio i{{display:block}}
/* 字体 */
.type{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
.type div{{border-top:2px solid var(--fg);padding-top:14px;display:grid;gap:6px;align-content:start}}
.type .s1{{font:700 34px/1.2 var(--f-zh);letter-spacing:.16em}}
.type .s2{{font:900 34px/1.2 var(--f-disp)}}
.type .s3{{font:600 22px/1.4 var(--f-lat);letter-spacing:.3em}}
.type p{{color:var(--muted);font-size:13px}}
/* 最小尺寸 */
.mins{{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}}
.mn{{display:grid;gap:4px;font-size:13px;align-content:start}} .mn span{{color:var(--muted);font-size:12px}}
.mn-art{{height:96px;background:#0B3B2A;display:flex;align-items:center;justify-content:center;margin-bottom:6px}}
.ms{{display:block}} .ms svg{{width:100%;height:auto;display:block}}
/* 禁用 */
.dns{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}}
.dn{{margin:0}} .dn-art{{aspect-ratio:16/10;max-width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--rule)}}
.dn-art svg{{width:100%;height:100%}}
.dn figcaption{{font-size:13px;margin-top:8px;display:flex;gap:8px;align-items:baseline}}
.dn i{{font:700 16px/1 var(--f-lat);color:var(--warn);font-style:normal}}
/* 应用 */
.apps{{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:24px;align-items:start}}
.apps figure{{margin:0;display:grid;gap:10px}} .apps figcaption{{font-size:13px;color:var(--muted)}}
.apps figcaption b{{color:var(--fg)}}
svg.mock-p{{width:100%;max-width:420px;box-shadow:0 18px 40px -20px rgba(0,0,0,.45)}}
.mock-p .pg line{{stroke:#F08A6C;stroke-width:2}} .mock-p .pg text{{font:600 18px var(--f-lat);fill:#F08A6C}}
.apps-r{{display:grid;gap:28px}}
svg.mock-a,svg.mock-v,svg.mock-c{{width:100%;height:auto;max-width:520px}}
.deliv{{columns:2;column-gap:32px;font-size:13px}} .deliv code{{font:500 12px/1.9 ui-monospace,Menlo,monospace;color:var(--accent)}}
footer .wrap{{padding-block:36px 56px;color:var(--muted);font-size:13px}}
:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
@media (max-width:820px){{
  .hero .wrap,section .wrap{{grid-template-columns:minmax(0,1fr);gap:22px}}
  .hero .wrap{{padding-block:48px 40px}}
  .cons-grid,.spec-row,.apps{{grid-template-columns:minmax(0,1fr)}}
  .fams,.vers{{grid-template-columns:minmax(0,1fr)}}
  .css,.idea,.type{{grid-template-columns:minmax(0,1fr)}}
  .pal{{grid-template-columns:repeat(2,minmax(0,1fr))}} .mins{{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .dns{{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .spec-row{{padding:18px}} .spec-art{{padding:44px 54px 52px}}
  .deliv{{columns:1}}
}}
</style>

<header class="hero"><div class="wrap">
  <div class="hero-art">{svg(hero_b, hw, hh)}</div>
  <div>
    <div class="eyebrow">Brand Identity · Logo System · v1.0</div>
    <h1>南伴球标志规范</h1>
    <p>一个符号，四种组合，五个配色版本。所有图形来自同一套几何（<span class="num">marketing/brand/logo.py</span>），文字已转曲，不依赖字体，任何尺寸、任何软件里都长一样。</p>
    <div class="meta">MELBOURNE · 2026.11 · 墨尔本华人网球约局</div>
  </div>
</div></header>

<section><div class="wrap">
  <div class="sh"><div class="no">01</div><h2>标志理念</h2><div class="en">Concept</div></div>
  <div class="body">
    <p class="lead">一大一小两颗网球，挨着，但不重叠。名字里的「伴」就是这个画面：找到一个水平相当的人，一起去打球。</p>
    <div class="idea">
      <div><b>两颗球 = 两个人</b><p>约球的最小单位是两个人。大小不同，说明不必一样强；靠在一起，说明已经约上了。</p></div>
      <div><b>留白环 = 分寸</b><p>小球外留出一圈空隙，“切”进大球里。陌生人约球要有边界感，挨得近，也各有空间。</p></div>
      <div><b>一来一回</b><p>两条球缝转向相反（−22° / +28°），像一拍过去、一拍回来。签名式里小双球抛在字缝上方，是发球前的那一抛。</p></div>
    </div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">02</div><h2>符号构成</h2><div class="en">Construction</div></div>
  <div class="body">
    <div class="cons-grid">
      {cons}
      <table><tbody>{facts_html}</tbody></table>
    </div>
    <ul class="rules">
      <li>标志一律<b>平涂单色</b>：球缝和留白环是镂空，透出底色，所以换任何一种颜色都成立，也能丝印、刺绣、烫金、刻章。</li>
      <li>立体渐变的球只用在 <b>App 图标</b>和插画里，那是产品表达；标志本身不加高光、阴影、渐变。</li>
      <li>符号的几何与 App 图标（<span class="num">icons/icon.svg</span>）同一套坐标，两者永远一致。</li>
    </ul>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">03</div><h2>标志家族</h2><div class="en">Logo Family</div></div>
  <div class="body">
    <p class="lead">按空间形状选组合：横长用横式，方或竖长用竖式，海报落款用签名式。同一个画面只出现一次标志。</p>
    <div class="fams">{fam_html}</div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">04</div><h2>组合比例</h2><div class="en">Lockup Specs</div></div>
  <div class="body">
    <p class="lead">所有比例都以中文字标的墨迹高度 <b>h</b> 为单位（字号 F 时 h ≈ 0.94 F），放大缩小都不变。</p>
    <div class="specs">
      <div class="spec-row"><div class="spec-art">{spec_h()}</div><div><h3>横式</h3><ul>
        <li>符号高 = 1.25 h：圆形视觉上比方块字小，放大 25% 才显得一样重</li>
        <li>符号与字的上下中线对齐（按墨迹，不按字身框）</li>
        <li>间距 = 0.75 x；字距 0.16 em</li>
        <li>双行版：英文 NANBANQIU 与中文同宽，符号高度 = 两行总高</li></ul></div></div>
      <div class="spec-row"><div class="spec-art">{spec_v()}</div><div><h3>竖式</h3><ul>
        <li>符号高 = 1.9 h，按外框水平居中</li>
        <li>符号到字 = 0.55 h；字到英文 = 0.34 h</li>
        <li>字距 0.24 em；英文字高 0.22 h，字距自动撑到与中文同宽</li></ul></div></div>
      <div class="spec-row"><div class="spec-art">{spec_sig()}</div><div><h3>签名式</h3><ul>
        <li>正式场合的落款；日常海报用点式签名（同样位置，两颗纯色球）</li>
        <li>符号高 = 0.55 h，中心对准「伴」「球」之间的字缝</li>
        <li>符号底到字顶 = 0.12 h，像球刚被抛起</li>
        <li>不加英文行；需要城市名时在下方另起一行小字，不算标志的一部分</li></ul></div></div>
    </div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">05</div><h2>安全区</h2><div class="en">Clear Space</div></div>
  <div class="body">
    <p class="lead">标志四周至少留出 <b>1 x</b>（x = 该组合里小球的直径）。安全区内不放文字、图形、画面边缘。</p>
    <div class="css">
      <figure>{clearspace(L.lockup_h, 'h', 1.25, '横式')}<figcaption>横式</figcaption></figure>
      <figure>{clearspace(lambda i, b: L.lockup_v(i, b), 'v', 1.9, '竖式')}<figcaption>竖式</figcaption></figure>
      <figure>{clearspace(L.lockup_sig, 'sig', .55, '签名式')}<figcaption>签名式：x 很小，实际按 0.5 h 留</figcaption></figure>
    </div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">06</div><h2>配色版本</h2><div class="en">Colour Versions</div></div>
  <div class="body">
    <p class="lead">荧光黄绿只放在深色底上。浅色、黄绿色底上，整个标志改用深绿单色。</p>
    <div class="vers">{ver_html}</div>
    <ul class="rules">
      <li>黄绿在深绿上的对比度是 <b class="num">{lc:.1f} : 1</b>，在奶油色上只有 <b class="num">{contrast(C['cream'], C['lime']):.2f} : 1</b>，几乎看不见。这就是浅底必须用单色的原因（海报 50、58、67 号踩过）。</li>
      <li>照片上：暗部用深底全彩或反白；亮部用深绿单色；背景太花就先压一块深色再放。</li>
    </ul>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">07</div><h2>品牌色</h2><div class="en">Palette</div></div>
  <div class="body">
    <div class="pal">{pal_html}</div>
    <div><div class="ratio" aria-label="用色比例"><i style="flex:60;background:{C['deep']}"></i><i style="flex:25;background:{C['cream']}"></i><i style="flex:10;background:{C['green']}"></i><i style="flex:5;background:{C['lime']}"></i></div>
    <p style="font-size:13px;color:var(--muted);margin-top:8px">用色比例约 深绿 60 · 奶油 25 · 球场绿 10 · 黄绿 5。黄绿越少越亮，一个画面里它只属于球。</p></div>
    <ul class="rules">
      <li>荧光黄绿印刷时 CMYK 会发灰。周边和印刷品请用专色，打样比对 Pantone 381 C / 375 C / 802 C，选最接近屏幕色的一个定下来。</li>
      <li>橙 <span class="num">#E8643C</span>、琥珀 <span class="num">#F2B134</span> 只用于复古系列海报，不进标志。</li>
    </ul>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">08</div><h2>标准字</h2><div class="en">Typography</div></div>
  <div class="body">
    <div class="type">
      <div><span class="s1">南伴球</span><b>字标 · 思源黑体 Bold</b><p>只用于标志，已转曲。正文不要模仿它的宽字距。</p></div>
      <div><span class="s2">今晚，有人在打球。</span><b>标题 · 思源宋体 Bold / Heavy</b><p>海报标题、宣传语。衬线给温度，和黑体字标拉开层次。</p></div>
      <div><span class="s3">NANBANQIU</span><b>英文 · Inter SemiBold</b><p>全大写，字距 0.28–0.32 em；用于英文名、小标签。</p></div>
    </div>
    <p style="font-size:13px;color:var(--muted)">三款字体都是 SIL Open Font License，可免费商用。字标以后若请字体设计师精修（比如收紧「球」右侧的点、统一三个字的中宫），只需替换 <span class="num">glyphs.json</span>，所有组合自动更新。</p>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">09</div><h2>最小尺寸</h2><div class="en">Minimum Size</div></div>
  <div class="body">
    <div class="mins">{mins_html}</div>
    <p style="font-size:13px;color:var(--muted)">上面是实际最小尺寸。符号小于 24 px 时球缝会糊成一团，换成简化版（只保留两颗球和留白环）。</p>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">10</div><h2>禁止用法</h2><div class="en">Don’ts</div></div>
  <div class="body"><div class="dns">{dont_html}</div></div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">11</div><h2>应用示例</h2><div class="en">In Use</div></div>
  <div class="body">
    <div class="apps">
      <figure>{poster_mock()}<figcaption><b>海报（1080 × 1350）</b>：签名式（日常用点式签名）居中，宽 240 px（画布宽 22%），字底距画布底 60 px。小红书 3:4、竖屏 9:16 同样按宽 22%、底边距 4.5% 高。</figcaption></figure>
      <div class="apps-r">
        <figure>{app_mock()}<figcaption><b>App 顶栏</b>：横式，高 26 px，左对齐页面边距。</figcaption></figure>
        <figure>{avatar_mock()}<figcaption><b>社交头像</b>：符号外框高 = 圆直径 52%，居中。小红书、微信、Instagram 共用。</figcaption></figure>
        <figure>{card_mock()}<figcaption><b>名片</b>：正面奶油底竖式单色，背面深绿底符号 + 一行说明。</figcaption></figure>
      </div>
    </div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="sh"><div class="no">12</div><h2>文件交付</h2><div class="en">Files</div></div>
  <div class="body">
    <p class="lead">全部在仓库 <span class="num">marketing/brand/svg/</span>，命名 <span class="num">nanbanqiu-组合-配色.svg</span>，共 31 个，全部转曲。</p>
    <div class="deliv">
      <div><code>horizontal</code> 横式</div><div><code>horizontal-en</code> 横式双行</div><div><code>stacked</code> 竖式</div>
      <div><code>signature</code> 签名式</div><div><code>wordmark</code> 字标</div><div><code>mark</code> 符号</div>
      <div><code>mark-simple-dark</code> 简化符号</div>
      <div><code>-dark</code> 深底全彩</div><div><code>-light</code> 浅底单色</div><div><code>-lime</code> 黄绿底单色</div>
      <div><code>-black</code> 黑色单色</div><div><code>-white</code> 反白单色</div>
    </div>
    <p style="font-size:13px;color:var(--muted)">SVG 本身是透明底，配色版本名说明它应该放在什么底上。改标志只改 <span class="num">logo.py</span> 里的常量，然后运行 <span class="num">python3 marketing/brand/logo.py</span> 和 <span class="num">guide.py</span>。</p>
  </div>
</div></section>

<footer><div class="wrap">南伴球 Nanbanqiu · 标志规范 v1.0 · 2026-11-10</div></footer>'''


if __name__ == '__main__':
    p = os.path.join(L.HERE, 'guide.html')
    open(p, 'w', encoding='utf-8').write(page())
    print('→', p, os.path.getsize(p) // 1024, 'KB')
