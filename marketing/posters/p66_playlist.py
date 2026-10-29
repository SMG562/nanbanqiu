from lib import *

META = dict(
    id=66, slug='playlist', title='今日约球歌单', lines=['今日约球歌单。'],
    style=['信息图', 'UI', '幽默'], tone='深色', demo=False,
    concept='播放器界面：黑胶唱片中心贴着一颗网球，五首“歌”是打过球的人才懂的小毛病，时长是各自的荒诞数字，当前播放“说好随便打打”',
    use='把一堆小毛病串成歌单；社交传播',
)


def svg():
    random.seed(66)
    cx, cy, R = 540, 590, 190
    grooves = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{R-14-i*11}" fill="none" stroke="#fff" stroke-width="1" opacity="{.05+.03*(i%3)}"/>' for i in range(10))
    tracks = [('马上到（已经出发 20 分钟）', '3:20'), ('再打一局就走', '4:45'), ('说好，随便打打', '2:40'), ('脚踝没事，真的', '3:12'), ('下次一定约', '1:03')]
    rows = ''
    for i, (n, d) in enumerate(tracks):
        y = 880 + i * 66
        on = i == 2
        if on:
            rows += f'<rect x="64" y="{y-44}" width="952" height="62" rx="31" fill="{C["lime"]}"/>'
        col = '#0B3B2A' if on else '#F7EBD6'
        rows += f'<text x="108" y="{y}" font-family="{SANS}" font-weight="700" font-size="26" fill="{col}" opacity=".7">{i+1:02d}</text><text x="190" y="{y+2}" font-family="{SERIF}" font-weight="900" font-size="34" fill="{col}">{n}</text><text x="972" y="{y}" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="26" fill="{col}" opacity=".75">{d}</text>'
    body = f'''
<defs><radialGradient id="bg66" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="#1D6B4B"/><stop offset="1" stop-color="#06231A"/></radialGradient>
<radialGradient id="vn66" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#2A3A33"/><stop offset="1" stop-color="#0A100E"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg66)"/>
<ellipse cx="{cx+10}" cy="{cy+R-4}" rx="{R*.9:.0f}" ry="26" fill="#000" opacity=".4" filter="url(#bl28)"/>
<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#vn66)"/>{grooves}
<path d="M{cx-R*.8:.0f} {cy-R*.5:.0f} A{R} {R} 0 0 1 {cx+R*.2:.0f} {cy-R*.97:.0f}" fill="none" stroke="#fff" stroke-width="6" opacity=".08" stroke-linecap="round"/>
{ball('v', cx, cy, 78, rot=-25)}<circle cx="{cx}" cy="{cy}" r="9" fill="#06231A"/>
<rect x="64" y="810" width="952" height="6" rx="3" fill="#F7EBD6" opacity=".2"/><rect x="64" y="810" width="570" height="6" rx="3" fill="{C['lime']}"/><circle cx="634" cy="813" r="11" fill="{C['lime']}"/>
<text x="64" y="800" font-family="{SANS}" font-weight="700" font-size="20" letter-spacing="3" fill="#F7EBD6" opacity=".6">NOW PLAYING</text>
{rows}
{tag('TODAY\'S PLAYLIST')}
{headline(META['lines'], y=290, size=60, colors=C['cream'], ls=3)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
