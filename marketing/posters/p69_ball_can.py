from lib import *

META = dict(
    id=69, slug='ball-can', title='球罐成分表', lines=['每次约球，', '含 12% 的借口。'],
    style=['写实光影', '产品', '幽默'], tone='暖色', demo=False,
    concept='一只放大的球罐，罐身贴着食品成分表式的标签：期待 100%、汗水 80%、借口 12%、鸽子 3%；放在橙色大色块前',
    use='把约球里的小毛病装进球罐里；产品感的会心一笑',
)


def svg():
    random.seed(69)
    x0, x1, y0, y1 = 290, 790, 520, 1130
    rows = [('期待', '100%'), ('汗水', '80%'), ('借口', '12%'), ('鸽子', '3%')]
    r = ''
    for i, (n, v) in enumerate(rows):
        y = 790 + i * 78
        r += f'<text x="372" y="{y}" font-family="{SERIF}" font-weight="900" font-size="42" fill="#0B3B2A">{n}</text><text x="708" y="{y}" text-anchor="end" font-family="{SERIF}" font-weight="900" font-size="42" fill="#0B3B2A">{v}</text><path d="M366 {y+18} H714" stroke="#0B3B2A" stroke-width="{4 if i==3 else 2}" opacity="{.9 if i==3 else .25}"/>'
    body = f'''
<defs>
 <linearGradient id="bg69" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F58A56"/><stop offset="1" stop-color="#D95A2B"/></linearGradient>
 <linearGradient id="cn69" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0A3626"/><stop offset=".3" stop-color="#1F7A53"/><stop offset=".55" stop-color="#14573B"/><stop offset="1" stop-color="#062418"/></linearGradient>
 <linearGradient id="mt69" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A949A"/><stop offset=".3" stop-color="#F4F7F8"/><stop offset=".7" stop-color="#B7C0C5"/><stop offset="1" stop-color="#6E787E"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg69)"/>
<ellipse cx="560" cy="{y1+10}" rx="290" ry="34" fill="#000" opacity=".4" filter="url(#bl28)"/>
<path d="M{x0} {y0} V{y1} A250 38 0 0 0 {x1} {y1} V{y0} Z" fill="url(#cn69)"/>
<ellipse cx="540" cy="{y0}" rx="250" ry="38" fill="url(#mt69)"/>
<ellipse cx="540" cy="{y0+2}" rx="226" ry="28" fill="#2B3338"/>
<ellipse cx="540" cy="{y0}" rx="250" ry="38" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
<rect x="{x0}" y="{y1-70}" width="{x1-x0}" height="40" fill="#C6EA3D" opacity=".95"/>
<path d="M{x0+6} {y0+30} H{x0+6}" />
<rect x="340" y="580" width="400" height="460" rx="16" fill="#F7EBD6"/>
<rect x="340" y="580" width="400" height="460" rx="16" fill="none" stroke="#0B3B2A" stroke-width="4"/>
<text x="372" y="654" font-family="{SERIF}" font-weight="900" font-size="54" fill="#0B3B2A">成分表</text>
<text x="372" y="696" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="3" fill="#0B3B2A" opacity=".7">每次约球 · 每份</text>
<path d="M366 722 H714" stroke="#0B3B2A" stroke-width="8"/>
{r}
<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="url(#cn69)" opacity="0"/>
<path d="M{x0+36} {y0+40} V{y1-20}" stroke="#fff" stroke-width="10" opacity=".14" stroke-linecap="round" filter="url(#bl6)"/>
{ball('c', 640, 440, 70, rot=20)}
{tag('INGREDIENTS', color='#4A2410', rule='#4A2410')}
{headline(META['lines'], y=290, size=62, colors='#3A1B0C', ls=3, lh=80)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18, True)}'''
    return page(body)
