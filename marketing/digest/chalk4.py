"""立式小黑板三版：roll「还有谁没到？」· notes「传纸条」· seats「这里有人吗？」
用法：chalk4:roll / chalk4:notes / chalk4:seats"""
import random
from chalkframe import *
from timetable import GAMES, spots, level_word
_v = ['roll']; _skin = ['fair']
EX = {'roll': ['还有谁没到', f'{spots()}', '7Kq2'], 'notes': ['传纸条', f'{spots()}个空位', '7Kq2'], 'seats': ['这里有人吗', f'{spots()}个座', '7Kq2']}
def EXPECT(): return EX[_v[0]]
def HEADLINE(): return (str(spots()), '.kn')
def need(g): return CAP[g[4]] - g[7]
def meta(g): return f'{TYPE[g[4]]} · {level_word(g[5], g[6])}'
def groups():
    return [('上 午', [g for g in GAMES if int(g[0][:2]) < 12]), ('下 午', [g for g in GAMES if 12 <= int(g[0][:2]) < 17]), ('放学别走', [g for g in GAMES if int(g[0][:2]) >= 17])]

# ---------- 还有谁没到？ ----------
def hand():
    # 举手：短袖口 + 宽手掌 + 并拢的四指 + 拇指，一笔一笔用粉笔勾
    return f'''<g class="art" transform="translate(846 318) rotate(10)">
 <path d="M-46 64 L-50 176 L50 176 L46 64Z" fill="{PK}" fill-opacity=".35" stroke="{PK}" stroke-width="4" stroke-linejoin="round"/>
 {''.join(f'<path d="M{-40+k*12} 76 l-3 94" stroke="{PK}" stroke-width="2" opacity=".55"/>' for k in range(8))}
 <path d="M-50 66 H50" stroke="{W_}" stroke-width="6" stroke-linecap="round"/>
 <path d="M-40 62 C -44 30, -42 6, -38 -8 L -38 -62 C -38 -74, -20 -74, -20 -62 L -20 -84 C -20 -97, -1 -97, -1 -84 L -1 -90 C -1 -103, 18 -103, 18 -90 L 18 -80 C 18 -92, 37 -92, 37 -80 L 37 -10 C 38 14, 40 38, 40 62" fill="{W_}" fill-opacity=".12" stroke="{W_}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
 <path d="M-20 -62 V-20 M-1 -84 V-22 M18 -80 V-20" stroke="{W_}" stroke-width="2.4" opacity=".55" stroke-linecap="round"/>
 <path d="M-38 -4 C -56 -18, -70 -34, -66 -46 C -62 -56, -48 -48, -38 -30" fill="{W_}" fill-opacity=".12" stroke="{W_}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
 <g stroke="{YL}" stroke-width="4" stroke-linecap="round"><path d="M-64 -112 l-14 -18"/><path d="M0 -128 v-24"/><path d="M60 -106 l14 -18"/></g></g>
<g class="art"><circle cx="964" cy="220" r="34" fill="none" stroke="{LM}" stroke-width="3.5"/><path d="M942 244 l-14 18 l26 -8" fill="none" stroke="{LM}" stroke-width="3.5" stroke-linejoin="round"/>
<text x="964" y="232" text-anchor="middle" font-family="{WK}" font-weight="700" font-size="32" fill="{LM}">到</text></g>'''

def roll():
    random.seed(4); rows = ''
    for label, gs in groups():
        if not gs: continue
        rows += f'<div class="grp {"pink" if label == "放学别走" else ""}">{label}</div>'
        for g in gs:
            cells = ''
            for k in range(CAP[g[4]]):
                if k < g[7]:
                    c = random.choice([W_, W_, W_, PK, BL]); cells += f'<i class="got" style="color:{c}"><span style="transform:rotate({random.randint(-12,12)}deg);font-size:{random.randint(22,29)}px;font-weight:{random.choice((400,700))}">到</span></i>'
                else: cells += '<i class="open"></i>'
            rows += f'<div class="row"><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(g[3])} · {meta(g)} · {g[9]}</s></div><div class="cells">{cells}</div><b class="lime n">缺 {need(g)}</b></div>'
    svg = title('还有谁', 96, 326, 120, fill=W_, stroke='#2F5A4B') + title('没到？', 96, 470, 150) + hand()
    html_ = f'''<div class="iss">明天点名 · 第 {ISSUE} 期</div>
<div class="sub">明天 {len(GAMES)} 节课，<span class="kn">{spots()}</span> 个位置还没人喊「到」。</div>
<div class="box"><div class="tab">点名册</div>{rows}</div>{date_tag(130, 570)}{how('喊到')}'''
    css = f'''.iss{{position:absolute;left:100px;top:196px;font-size:22px;letter-spacing:6px;opacity:.75}}
.sub{{position:absolute;left:100px;top:506px;font-size:32px}} .kn{{color:{LM};font-size:44px;font-weight:700;padding:0 4px}}
.box{{position:absolute;left:96px;right:96px;top:584px;height:590px;border:3px solid rgba(244,242,234,.85);border-radius:26px;padding:30px 28px 10px}}
.tab{{position:absolute;left:36px;top:-24px;padding:0 18px;font-size:30px;font-weight:700;background:{SLATE};color:{YL};letter-spacing:6px}}
.grp{{font-size:19px;letter-spacing:8px;opacity:.8;height:32px;border-bottom:1.5px dashed rgba(244,242,234,.3);margin-top:4px}} .grp.pink{{opacity:1}}
.row{{display:grid;grid-template-columns:100px 1fr 200px 64px;align-items:center;height:56px;border-bottom:1.5px solid rgba(244,242,234,.14)}}
.t{{font-size:30px}} .v b{{display:block;font-size:24px;white-space:nowrap}} .v s{{display:block;font-size:14px;opacity:.6;white-space:nowrap}}
.cells{{display:flex;gap:8px}} .cells i{{width:42px;height:42px;display:flex;align-items:center;justify-content:center}}
.got{{border:2px solid rgba(244,242,234,.45)}} .got span{{display:block}} .open{{border:2.6px dashed {LM}}} .n{{font-size:24px;text-align:right}}'''
    return framed(svg, html_, css, seed=12, skin=_skin[0])

# ---------- 传纸条 ----------
def notes():
    random.seed(8)
    when = lambda t: '明早' if int(t[:2]) < 12 else ('明天下午' if int(t[:2]) < 17 else '明晚')
    mag = [LM, PK, BL, YL]
    paper = ''
    for i, g in enumerate(GAMES):
        c, r = i % 2, i // 2; x = 100 + c * 452 + random.randint(-6, 6); y = 548 + r * 158 + random.randint(-5, 5); rot = random.choice((-2.2, -1.2, 1, 1.8, -0.6, 2.4))
        paper += f'''<div class="note" style="left:{x}px;top:{y}px;transform:rotate({rot}deg)"><i class="mag" style="background:radial-gradient(circle at 35% 30%,#fff 0 12%,{mag[i%4]} 40%,{mag[i%4]})"></i>
<b>{when(g[0])} {g[0]} · {esc(g[2])}</b><s>{meta(g)} · 还差 {need(g)} 人<u>{g[9]}</u></s><p>去吗？<em></em>去<em></em>当然去</p></div>'''
    plane = f'''<g class="art"><path d="M768 296 C 800 262, 822 316, 862 276 S 908 228, 930 230" fill="none" stroke="{W_}" stroke-width="2.6" stroke-dasharray="6 9" opacity=".7"/>
<g transform="translate(948 222) rotate(-18)"><path d="M0 0 L-64 -22 L-46 6Z" fill="{W_}" fill-opacity=".35" stroke="{W_}" stroke-width="3.2" stroke-linejoin="round"/><path d="M0 0 L-46 6 L-52 26Z" fill="{W_}" fill-opacity=".15" stroke="{W_}" stroke-width="3.2" stroke-linejoin="round"/><path d="M0 0 L-46 6" stroke="{W_}" stroke-width="2"/></g></g>'''
    svg = title('传纸条。', 96, 400, 156) + plane
    html_ = f'''<div class="iss">{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 第 {ISSUE} 期</div><div class="sub">明天 {len(GAMES)} 张纸条，<span class="kn">{spots()}</span> 个空位，就差你打个勾。</div>{how('打勾')}'''
    css = f'''.iss{{position:absolute;left:100px;top:206px;font-size:22px;letter-spacing:6px;opacity:.75}}
.sub{{position:absolute;left:100px;top:432px;font-size:30px}} .kn{{color:{LM};font-size:42px;font-weight:700;padding:0 4px}}
.tagd{{display:none}}
.note{{position:absolute;width:428px;height:136px;padding:20px 22px 0 26px;color:#26386A;font-family:{WK};border-radius:3px;
 background:linear-gradient(90deg,rgba(0,0,0,0) 49.4%,rgba(0,0,0,.07) 50%,rgba(255,255,255,.5) 50.6%,rgba(0,0,0,0) 52%),repeating-linear-gradient(180deg,#FBF7EE 0 27px,#C9D8EC 27px 28px);
 box-shadow:0 10px 18px -6px rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.7) inset}}
.mag{{position:absolute;left:50%;top:-12px;width:26px;height:26px;margin-left:-13px;border-radius:50%;box-shadow:0 3px 5px rgba(0,0,0,.4)}}
.note b{{display:block;font-size:23px;font-weight:700;white-space:nowrap}} .note s{{display:flex;font-size:18px;margin-top:6px;opacity:.85}} .note s u{{margin-left:auto;font-size:16px;color:#7A7F8C;letter-spacing:1px}}
.note p{{font-size:21px;margin-top:8px;display:flex;align-items:center;gap:6px}} .note em{{display:inline-block;width:20px;height:20px;border:2px solid #26386A;margin-left:14px;border-radius:2px}}'''
    return framed(svg, html_, css, paper_html=paper, seed=18, skin=_skin[0])

# ---------- 这里有人吗？ ----------
def desks(n, x0, y0, have):
    out = ''; cols = 2; idx = 0
    for k in range(n):
        cx = x0 + (k % cols) * 74; cy = y0 + (k // cols) * 66
        if k < have:
            out += f'<rect x="{cx}" y="{cy}" width="62" height="38" rx="4" fill="none" stroke="{W_}" stroke-width="3"/><path d="M{cx+12} {cy+48} q19 12 38 0" stroke="{W_}" stroke-width="3" fill="none"/>'
            out += f'<rect x="{cx+18}" y="{cy+7}" width="26" height="24" rx="5" fill="{random.choice((PK, BL, YL))}" fill-opacity=".55" stroke="{W_}" stroke-width="2"/><path d="M{cx+18} {cy+15} h26" stroke="{W_}" stroke-width="2"/>'
        else:
            out += f'<rect x="{cx}" y="{cy}" width="62" height="38" rx="4" fill="none" stroke="{LM}" stroke-width="3" stroke-dasharray="7 6"/><path d="M{cx+12} {cy+48} q19 12 38 0" stroke="{LM}" stroke-width="3" fill="none" stroke-dasharray="5 5"/>'
    return out

def seats():
    random.seed(5); art = ''; cells = ''
    for i, g in enumerate(GAMES):
        c, r = i % 2, i // 2; x = 100 + c * 452; y = 548 + r * 158
        art += '<g class="art">' + desks(CAP[g[4]], x, y + (33 if CAP[g[4]] == 2 else 0), g[7]) + '</g>'
        ev = '<em class="pink">放学别走</em>' if int(g[0][:2]) >= 17 else ''
        cells += f'<div class="seat" style="left:{x+164}px;top:{y-6}px"><b class="t">{g[0]}{ev}</b><b class="vn">{esc(g[2])}</b><s>{esc(g[3])} · {meta(g)}</s><p><span class="lime">空 {need(g)} 座</span><u>{g[9]}</u></p></div>'
    svg = title('这里', 96, 330, 124, fill=W_, stroke='#2F5A4B') + title('有人吗？', 360, 330, 124) + f'''
<rect x="390" y="452" width="300" height="46" rx="4" fill="none" stroke="{W_}" stroke-width="3"/><text x="540" y="484" text-anchor="middle" font-family="{WK}" font-size="24" letter-spacing="14" fill="{W_}">讲台</text>''' + art
    html_ = f'''<div class="iss">明天的座位表 · {TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 第 {ISSUE} 期</div><div class="sub">明天还有 <span class="kn">{spots()}</span> 个座，没人。</div>{cells}{how('占座')}'''
    css = f'''.iss{{position:absolute;left:100px;top:196px;font-size:22px;letter-spacing:6px;opacity:.75}}
.sub{{position:absolute;left:100px;top:372px;font-size:34px}} .kn{{color:{LM};font-size:46px;font-weight:700;padding:0 4px}}
.tagd{{display:none}}
.seat{{position:absolute;width:270px}} .seat .t{{display:flex;align-items:baseline;gap:12px;font-size:30px}} .seat .t em{{font-size:17px;letter-spacing:3px}}
.seat .vn{{display:block;font-size:23px;white-space:nowrap}} .seat s{{display:block;font-size:14px;opacity:.6;white-space:nowrap;margin-top:2px}}
.seat p{{display:flex;font-size:21px;margin-top:6px}} .seat p u{{margin-left:auto;font-size:19px;opacity:.85;letter-spacing:1px}}'''
    return framed(svg, html_, css, seed=27, skin=_skin[0])

def html(v='roll'):
    v, _, skin = v.partition('@'); _v[0] = v; _skin[0] = skin or 'fair'
    import chalkframe; chalkframe.CUR[0] = _skin[0]; chalkframe.SEAL_AT[0] = {'roll': (606, 392), 'notes': (800, 336), 'seats': (900, 372)}[v]
    return {'roll': roll, 'notes': notes, 'seats': seats}[v]()
