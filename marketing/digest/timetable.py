from common import *
# 演示快照：明天还缺人的 8 局（字段 = digest_snapshot 返回的公开字段）
GAMES = [  # 开始, 结束, 球场短名, 区, 类型, 水平, 已有人数, 标签
    ('07:30', '09:00', 'Kooyong LTC', 'Kooyong', 'd', '3.0–4.0', 2, '场地已订'),
    ('08:00', '10:00', 'Fawkner Park', 'South Yarra', 's', '4.0–5.0', 1, ''),
    ('09:30', '11:30', 'Box Hill TC', 'Box Hill', 'r', '2.0–3.0', 1, '新手友好'),
    ('10:00', '12:00', 'Caulfield Park', 'Caulfield North', 'd', '3.5–4.5', 1, ''),
    ('14:00', '16:00', 'Glen Waverley TC', 'Glen Waverley', 'd', '3.0–4.0', 3, '开新球'),
    ('16:30', '18:00', 'Albert Park LTC', 'Albert Park', 's', '4.5–5.5', 1, ''),
    ('18:30', '20:30', 'Melbourne Park', 'Melbourne', 'd', '3.5–4.5', 2, '场地已订'),
    ('19:00', '21:00', 'Doncaster TC', 'Doncaster', 'd', '2.5–3.5', 2, '新手友好'),
]
SECTIONS = [('上午', 'MORNING', 0, 12), ('下午', 'AFTERNOON', 12, 17), ('晚上', 'EVENING', 17, 24)]

def svg():
    spots = sum(CAP[g[4]] - g[6] for g in GAMES)
    L, R = 84, 996
    b = f'''<defs><radialGradient id="bgT" cx="30%" cy="15%" r="110%"><stop offset="0" stop-color="#11523B"/><stop offset=".6" stop-color="#0B3B2A"/><stop offset="1" stop-color="#05241A"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bgT)"/>
{tag('TOMORROW · MELBOURNE', y=104)}{demo_badge()}
{headline(['明天，', f'还有 {spots} 个空位。'], y=222, size=72, lh=88)}
{sub(f'{DATE_ZH}　·　{len(GAMES)} 局还在找人', y=362, size=25, op=.7, ls=3)}'''
    y = 404
    for zh, en, h0, h1 in SECTIONS:
        rows = [g for g in GAMES if h0 <= int(g[0][:2]) < h1]
        if not rows: continue
        b += f'''<text x="{L}" y="{y+34}" font-family="{SERIF}" font-weight="700" font-size="26" fill="{C['lime']}">{zh}</text>
<text x="{L+66}" y="{y+33}" font-family="{SANS}" font-size="13" letter-spacing="6" fill="{C['cream']}" opacity=".45">{en}</text>
<line x1="{L+66+len(en)*15+14}" y1="{y+28}" x2="{R}" y2="{y+28}" stroke="{C['cream']}" stroke-opacity=".18"/>'''
        y += 50
        for i, (t0, t1, v, sb, ty, lv, have, tg) in enumerate(rows):
            cap = CAP[ty]; need = cap - have; cy = y + 40
            meta = ' · '.join(x for x in (sb, TYPE[ty], tg) if x)
            dots = ''.join(f'<circle cx="{906 - (cap-1-k)*24}" cy="{cy}" r="8.5" ' + (f'fill="{C["lime"]}"/>' if k >= have else f'fill="{C["cream"]}" fill-opacity=".28"/>') for k in range(cap))
            b += f'''<text x="{L}" y="{y+44}" font-family="{SANS}" font-weight="700" font-size="40" fill="{C['cream']}" style="font-variant-numeric:tabular-nums">{t0}</text>
<text x="{L+2}" y="{y+70}" font-family="{SANS}" font-size="17" fill="{C['cream']}" opacity=".45" style="font-variant-numeric:tabular-nums">至 {t1}</text>
<text x="262" y="{y+38}" font-family="{SANS}" font-weight="700" font-size="29" fill="{C['cream']}">{esc(v)}</text>
<text x="262" y="{y+68}" font-family="{SANS}" font-size="19" fill="{C['cream']}" opacity=".6" letter-spacing="1">{esc(meta)}</text>
<rect x="636" y="{cy-18}" width="160" height="36" rx="18" fill="{C['cream']}" fill-opacity=".07" stroke="{C['cream']}" stroke-opacity=".28"/>
<text x="716" y="{cy+7}" text-anchor="middle" font-family="{SANS}" font-size="19" fill="{C['cream']}" opacity=".85" style="font-variant-numeric:tabular-nums">UTR {lv}</text>
{dots}<text x="{R}" y="{cy+8}" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="22" fill="{C['lime']}">缺 {need}</text>'''
            y += 80
            if i < len(rows) - 1: b += f'<line x1="{L}" y1="{y-2}" x2="{R}" y2="{y-2}" stroke="{C["cream"]}" stroke-opacity=".08"/>'
        y += 4
    fy = 1262
    b += f'''<line x1="{L}" y1="{fy-26}" x2="{R}" y2="{fy-26}" stroke="{C['cream']}" stroke-opacity=".18"/>
{qr(L, fy, 140)}
<text x="{L+170}" y="{fy+46}" font-family="{SERIF}" font-weight="700" font-size="30" fill="{C['cream']}">扫码看明天的球局</text>
<text x="{L+170}" y="{fy+84}" font-family="{SANS}" font-size="20" fill="{C['cream']}" opacity=".7">申请加入，发起人确认就成局。</text>
<text x="{L+170}" y="{fy+124}" font-family="{SANS}" font-size="16" fill="{C['cream']}" opacity=".42" letter-spacing="1">截至 9:00 · 实时以 App 为准 · nanbanqiu.app</text>
<g transform="translate({R} {fy+66})"><circle cx="-122" cy="-46" r="10" fill="{C['lime']}"/><circle cx="-104" cy="-35" r="6.5" fill="{C['lime']}" stroke="{C['deep']}" stroke-width="2.5"/>
<text x="0" y="0" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="34" letter-spacing="10" fill="#fff">南伴球</text>
<text x="0" y="28" text-anchor="end" font-family="{SANS}" font-size="12" letter-spacing="5" fill="#fff" opacity=".6">NANBANQIU</text></g>
{grain(.14)}'''
    return page(b)
