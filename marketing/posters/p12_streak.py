from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=12, slug='streak', title='打卡', lines=['约上人，', '才坚持得住。'],
    style=['信息图'], tone='深色', demo=True,
    concept='类似 GitHub 的打卡热力图，周末最亮，最新一格是一颗发光的球',
    use='讲坚持打球、长期习惯',
)


def svg():
    random.seed(42)
    cols,rows,cs,gap=13,7,56,14; x0,y0=92,540
    cols_svg=''
    cc=["#0F2A20","#2E6B4A","#7FB83A","#C6EA3D"]
    last=None
    for c in range(cols):
        for r in range(rows):
            if c==cols-1 and r>3: lvl=0; fut=True
            else:
                fut=False
                p=random.random()
                wk = r>=5
                if wk: lvl = 3 if p<.45 else (2 if p<.7 else (1 if p<.8 else 0))
                else: lvl = 2 if p<.12 else (1 if p<.25 else 0)
                if c<2: lvl=max(0,lvl-1)
            x=x0+c*(cs+gap); y=y0+r*(cs+gap)
            cols_svg+=f'<rect x="{x}" y="{y}" width="{cs}" height="{cs}" rx="14" fill="{cc[lvl]}" opacity="{.5 if fut else 1}"/>'
            if lvl==3 and c==cols-1 and r==2: last=(x+cs/2,y+cs/2)
    if not last: last=(x0+12*(cs+gap)+cs/2,y0+2*(cs+gap)+cs/2)
    marks=''.join(f'<text x="{x0+c*(cs+gap)}" y="{y0-24}" font-family="{SANS}" font-size="20" fill="#fff" opacity=".55" letter-spacing="3">{t}</text>' for c,t in ((0,"8月"),(4,"9月"),(9,"10月")))
    rowl=''.join(f'<text x="{x0-14}" y="{y0+r*(cs+gap)+38}" text-anchor="end" font-family="{SANS}" font-size="16" fill="#fff" opacity=".4">{t}</text>' for r,t in ((0,"一"),(2,"三"),(4,"五"),(6,"日")))
    leg=''.join(f'<rect x="{800+i*34}" y="1032" width="24" height="24" rx="7" fill="{c}"/>' for i,c in enumerate(cc))
    body=f'''
<defs><radialGradient id="bg12" cx="50%" cy="30%" r="90%"><stop offset="0" stop-color="#0E3A2B"/><stop offset="1" stop-color="#040F0A"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg12)"/>
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">LAST 13 WEEKS</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="700" font-size="108" letter-spacing="4">约上人，</text>
 <text x="80" y="450" font-family="{SERIF}" font-weight="700" font-size="108" letter-spacing="4" fill="#C6EA3D">才坚持得住。</text>
</g>
{marks}{rowl}{cols_svg}
<circle cx="{last[0]}" cy="{last[1]}" r="60" fill="#C6EA3D" opacity=".4" filter="url(#bl14)"/>
{ball('hm',last[0],last[1],34,-22)}
<text x="84" y="1054" font-family="{SANS}" font-size="20" fill="#fff" opacity=".55" letter-spacing="3">每个亮点，都是一场球</text>
<text x="770" y="1052" text-anchor="end" font-family="{SANS}" font-size="16" fill="#fff" opacity=".4">少</text>{leg}<text x="948" y="1052" font-family="{SANS}" font-size="16" fill="#fff" opacity=".4">多</text>
<text x="540" y="1190" text-anchor="middle" font-family="{SANS}" font-size="24" fill="#fff" opacity=".75" letter-spacing="6">有人约，就有每一周的球</text>
{wordmark(1268,"#fff",sub=False)}
{grain(.18)}'''
    return page(body)
