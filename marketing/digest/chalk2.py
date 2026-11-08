"""黑板报 · 另外四版：应用题 / 点名册 / 倒计时 / 战术板（用法：chalk2:quiz、chalk2:roll、chalk2:count、chalk2:tactic）。"""
from chalkbase import *
from timetable import GAMES, spots, level_word
FIRST = min(g[0] for g in GAMES); HOURS = (24 - 9) + int(FIRST[:2])        # 从今天 9:00 到明天第一局
EX = {'quiz': ['应用题', f'{spots()}', '7Kq2'], 'roll': ['点名', f'{spots()}个空位', '7Kq2'], 'count': [f'{HOURS}', f'{spots()}个空位', '7Kq2'], 'tactic': ['上网', f'{spots()}个空位', '7Kq2']}
_v = ['quiz']
def EXPECT(): return EX[_v[0]]
def HEADLINE(): return (str(HOURS) if _v[0] == 'count' else str(spots()), '.kn')
def need(g): return CAP[g[4]] - g[7]
def meta(g): return f'{g[3]} · {TYPE[g[4]]} · {level_word(g[5], g[6])}'

def quiz():
    lines = ''.join(f'''<div class="ln"><b class="no">{CIRC[i]}</b><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(meta(g))}</s></div><b class="lime">缺 {need(g)} 人</b><b class="c">→ {g[9]}</b></div>''' for i, g in enumerate(GAMES))
    body = f'''<div class="top">第 {ISSUE} 期 · 课堂练习</div>{date_block()}
<div class="lab">应用题</div>
<div class="q">明天墨尔本有 {len(GAMES)} 局网球，<br>一共还缺 <span class="kn lime">{spots()}</span> 人。<br><span class="lime">问：</span>你去哪一局？</div>
<div class="jie">解：</div><div class="list">{lines}</div>
<div class="ans">答：我去第 <u></u> 局。<small>交作业：浏览器打开 <b class="lime">{SITE}/g/</b> + 球局码</small></div>
<svg class="tick" width="190" height="150" viewBox="0 0 190 150"><path d="M14 70 L 58 118 L 170 14" fill="none" stroke="{PINK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="wm">南伴球<small>NANBANQIU</small></div>'''
    css = f'''.lab{{position:absolute;left:84px;top:150px;font-size:30px;font-weight:700;padding:4px 18px;border:2.5px solid {WHITE};border-radius:6px;letter-spacing:6px}}
.q{{position:absolute;left:84px;top:222px;font-size:56px;font-weight:700;line-height:1.38;letter-spacing:2px}}
.jie{{position:absolute;left:84px;top:498px;font-size:40px;font-weight:700}}
.list{{position:absolute;left:176px;right:84px;top:504px}}
.ln{{display:grid;grid-template-columns:48px 112px 1fr 104px 104px;align-items:center;height:66px}}
.no{{font-size:30px;opacity:.8}} .t{{font-size:32px}} .v b{{display:block;font-size:27px;white-space:nowrap}} .v s{{display:block;font-size:16px;opacity:.6;white-space:nowrap}} .ln>.lime{{font-size:24px}} .c{{font-size:24px;text-align:right}}
.ans{{position:absolute;left:84px;top:1060px;font-size:48px;font-weight:700}} .ans u{{display:inline-block;width:110px;border-bottom:3px solid {WHITE};margin:0 8px;vertical-align:-6px}}
.ans small{{display:block;font-size:24px;font-weight:400;opacity:.85;margin-top:18px}}
.tick{{position:absolute;left:560px;top:1010px}}'''
    return board(body, css, seed=21, ghosts=(('a² + b² = c²', 640, 470, 40, -5), ('x = 13', 100, 1270, 34, 3)))

def roll():
    rows = ''
    for g in GAMES:
        cells = ''.join('<i class="got">到</i>' if k < g[7] else '<i class="open"></i>' for k in range(CAP[g[4]]))
        rows += f'<div class="row"><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(meta(g))} · {g[9]}</s></div><div class="cells">{cells}</div><b class="lime n">缺 {need(g)}</b></div>'
    body = f'''<div class="top">MELBOURNE · 第 {ISSUE} 期</div>{date_block()}
<h1>明天点名。</h1><div class="sub"><span class="kn lime">{spots()}</span> 个空位，等你喊一声「到」。</div>
<div class="hd"><span>时间</span><span>球场 · 打法 · 水平 · 球局码</span><span>名单</span><span></span></div><div class="tbl">{rows}</div>
<div class="how">喊「到」：浏览器打开 <b class="lime">{SITE}/g/</b> + 球局码<small>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。</small></div>
<div class="wm">南伴球<small>NANBANQIU</small></div>'''
    css = f'''h1{{position:absolute;left:80px;top:150px;font-size:112px;font-weight:700;letter-spacing:6px}}
.sub{{position:absolute;left:86px;top:300px;font-size:36px}} .sub .kn{{font-size:48px;font-weight:700}}
.hd,.row{{display:grid;grid-template-columns:120px 1fr 236px 70px;align-items:center}}
.hd{{position:absolute;left:72px;right:72px;top:388px;font-size:17px;letter-spacing:3px;opacity:.55;padding-bottom:10px;border-bottom:2px solid rgba(241,240,232,.55)}}
.tbl{{position:absolute;left:72px;right:72px;top:428px}}
.row{{height:84px;border-bottom:1.5px solid rgba(241,240,232,.2)}}
.t{{font-size:34px}} .v b{{display:block;font-size:28px;white-space:nowrap}} .v s{{display:block;font-size:16px;opacity:.6;white-space:nowrap;margin-top:2px}}
.cells{{display:flex;gap:10px}} .cells i{{width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700}}
.got{{border:2px solid rgba(241,240,232,.55)}} .open{{border:2.5px dashed {LIME}}}
.n{{font-size:26px;text-align:right}}
.how{{position:absolute;left:84px;top:1150px;font-size:28px;line-height:1.6}} .how small{{display:block;font-size:20px;opacity:.6}}
.wm{{bottom:150px}}'''
    return board(body, css, seed=33)

def count():
    col = lambda gs: ''.join(f'<div class="it"><b class="t">{g[0]}</b><div><b>{esc(g[2])}</b><s>{esc(meta(g))}</s><em class="lime">缺 {need(g)} 位 · {g[9]}</em></div></div>' for g in gs)
    body = f'''<div class="top">MELBOURNE · 第 {ISSUE} 期</div>{date_block()}
<div class="hd1">距 明 天 第 一 局 开 打</div>
<div class="box"><span>还有</span><b class="kn">{HOURS}</b><span>小时</span></div><div class="note">（从今天 9:00 算起，第一局 {FIRST}）</div>
<div class="sec">明日安排 · <span class="lime">{spots()} 个空位</span></div>
<div class="cols"><div>{col(GAMES[:4])}</div><div>{col(GAMES[4:])}</div></div>
<div class="motto">今日事今日毕，明天的球今天约。<small>报名：浏览器打开 <b class="lime">{SITE}/g/</b> + 球局码</small></div>
<div class="wm">南伴球<small>NANBANQIU</small></div>'''
    css = f'''.hd1{{position:absolute;left:0;right:0;top:196px;text-align:center;font-size:40px;font-weight:700;letter-spacing:8px}}
.box{{position:absolute;left:230px;right:230px;top:262px;height:250px;border:3px solid {WHITE};outline:2px solid rgba(241,240,232,.5);outline-offset:8px;display:flex;align-items:center;justify-content:center;gap:24px}}
.box span{{font-size:44px;font-weight:700}} .box b{{font-size:210px;line-height:1;color:{PINK};font-weight:700;letter-spacing:-4px}}
.note{{position:absolute;left:0;right:0;top:540px;text-align:center;font-size:21px;opacity:.6}}
.sec{{position:absolute;left:84px;top:604px;font-size:30px;font-weight:700;padding-bottom:10px;border-bottom:2px solid rgba(241,240,232,.5);right:84px}}
.cols{{position:absolute;left:84px;right:84px;top:672px;display:grid;grid-template-columns:1fr 1fr;gap:0 48px}}
.it{{display:grid;grid-template-columns:118px 1fr;height:118px;align-items:start;padding-top:10px;border-bottom:1.5px solid rgba(241,240,232,.18)}}
.it .t{{font-size:36px}} .it b{{display:block;font-size:27px;white-space:nowrap}} .it s{{display:block;font-size:16px;opacity:.6;margin-top:4px;white-space:nowrap}} .it em{{display:block;font-size:21px;margin-top:6px}}
.motto{{position:absolute;left:84px;top:1170px;font-size:36px;font-weight:700}} .motto small{{display:block;font-size:22px;font-weight:400;opacity:.85;margin-top:14px}}
.wm{{bottom:150px}}'''
    return board(body, css, seed=44, ghosts=(('距期末还有 30 天', 620, 600, 32, -4), ('Deuce', 90, 1290, 36, 4)))

def tactic():
    # 球场（俯视，横放）+ 8 个编号圈沿箭头路线压向网前
    X0, Y0, Wc, Hc = 110, 436, 860, 380; net = X0 + Wc / 2; sy = Hc * 0.125; svx = Wc * 0.2
    court = f'''<rect x="{X0}" y="{Y0}" width="{Wc}" height="{Hc}" fill="none" stroke="{WHITE}" stroke-width="3"/>
<path d="M{X0} {Y0+sy} H{X0+Wc} M{X0} {Y0+Hc-sy} H{X0+Wc} M{net-svx} {Y0+sy} V{Y0+Hc-sy} M{net+svx} {Y0+sy} V{Y0+Hc-sy} M{net-svx} {Y0+Hc/2} H{net+svx}" stroke="{WHITE}" stroke-width="2.4" fill="none" opacity=".85"/>
<path d="M{net} {Y0-24} V{Y0+Hc+24}" stroke="{WHITE}" stroke-width="5" stroke-dasharray="3 7"/><circle cx="{net}" cy="{Y0-28}" r="6" fill="{WHITE}"/><circle cx="{net}" cy="{Y0+Hc+28}" r="6" fill="{WHITE}"/>'''
    pts = [(170, 760), (225, 560), (295, 690), (350, 500), (395, 640), (430, 540), (465, 700), (478, 600)]
    path = 'M' + ' L'.join(f'{x} {y}' for x, y in pts)
    marks = ''.join(f'<circle cx="{x}" cy="{y}" r="22" fill="#23312B" stroke="{LIME if i >= 6 else WHITE}" stroke-width="3"/><text x="{x}" y="{y+9}" text-anchor="middle" font-size="26" font-weight="700" fill="{LIME if i >= 6 else WHITE}">{i+1}</text>' for i, (x, y) in enumerate(pts))
    opp = ''.join(f'<path d="M{x-14} {y-14} L{x+14} {y+14} M{x+14} {y-14} L{x-14} {y+14}" stroke="{PINK}" stroke-width="4" stroke-linecap="round"/>' for x, y in ((760, 540), (840, 700)))
    svg = f'''<svg class="court" width="1080" height="1440" viewBox="0 0 1080 1440" style="position:absolute;left:0;top:0">{court}
<path d="{path}" fill="none" stroke="{LIME}" stroke-width="3" stroke-dasharray="10 9" stroke-linecap="round"/>
<path d="M502 600 C 512 596, 520 598, 528 602" stroke="{LIME}" stroke-width="4" fill="none"/><path d="M516 592 L530 603 L514 612" stroke="{LIME}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
{marks}{opp}<text x="556" y="592" font-size="26" font-weight="700" fill="{LIME}">← 上网</text></svg>'''
    col = lambda gs, o: ''.join(f'<div class="it"><b class="no">{CIRC[i+o]}</b><b class="t">{g[0]}</b><div><b>{esc(g[2])}</b><s>{esc(meta(g))} · <span class="lime">缺 {need(g)} · {g[9]}</span></s></div></div>' for i, g in enumerate(gs))
    body = f'''<div class="top">MELBOURNE · 第 {ISSUE} 期</div>{date_block()}
<div class="h0">明天的战术：</div><h1>先报名，<span class="lime">再上网。</span></h1>
{svg}<div class="tag">全场 <span class="kn lime">{spots()}</span> 个空位 · 按时间 ①→⑧</div>
<div class="cols"><div>{col(GAMES[:4], 0)}</div><div>{col(GAMES[4:], 4)}</div></div>
<div class="how">上网方式：浏览器打开 <b class="lime">{SITE}/g/</b> + 球局码</div>
<div class="wm">南伴球<small>NANBANQIU</small></div>'''
    css = f'''.h0{{position:absolute;left:84px;top:150px;font-size:44px;font-weight:700}}
h1{{position:absolute;left:80px;top:212px;font-size:96px;font-weight:700;letter-spacing:4px}}
.tag{{position:absolute;left:110px;top:842px;font-size:22px;opacity:.85}} .tag .kn{{font-size:30px;font-weight:700}}
.cols{{position:absolute;left:84px;right:84px;top:900px;display:grid;grid-template-columns:1fr 1fr;gap:0 40px}}
.it{{display:grid;grid-template-columns:40px 100px 1fr;align-items:center;height:64px;border-bottom:1.5px solid rgba(241,240,232,.18)}}
.it .no{{font-size:26px;opacity:.8}} .it .t{{font-size:28px}} .it b{{display:block;font-size:22px;white-space:nowrap}} .it s{{display:block;font-size:15px;opacity:.75;white-space:nowrap}}
.how{{position:absolute;left:84px;top:1196px;font-size:28px}}
.wm{{bottom:150px}}'''
    return board(body, css, seed=55, ghosts=(('X', 900, 470, 60, 0), ('Deuce', 90, 1290, 36, 4)))

def html(v='quiz'):
    _v[0] = v
    return {'quiz': quiz, 'roll': roll, 'count': count, 'tactic': tactic}[v]()
