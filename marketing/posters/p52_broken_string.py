from lib import *

META = dict(
    id=52, slug='broken-string', title='断线', lines=['断线，总在关键分。'],
    style=['写实光影', '微距', '质感'], tone='深色', demo=False,
    concept='球拍线床的微距：粗粗的拍线交织，一根竖线崩断，两头卷曲弹开，后面是一颗失焦的大球',
    use='拍线 / 器材小插曲；打过球的人都懂',
)


def svg():
    random.seed(52)
    r = random.Random(52)
    vx = [30 + 150 * i for i in range(8)]
    hy = [180 + 160 * j for j in range(8)]
    BR = 3  # 断掉的竖线
    def stroke(d, w=11, col='#F4F1E4', sh=True):
        s = f'<path d="{d}" fill="none" stroke="#000" stroke-width="{w+7}" stroke-linecap="round" opacity=".35" transform="translate(5 8)" filter="url(#bl6)"/>' if sh else ''
        return s + f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/><path d="{d}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6" transform="translate(-2 -2)"/>'
    vert = ''
    for i, x in enumerate(vx):
        if i == BR:
            vert += stroke(f'M{x} -40 V640 q6 34 40 40 q44 4 60 -34')
            vert += stroke(f'M{x} 1400 V800 q-4 -30 -38 -36 q-46 -6 -58 30')
            for k in range(4):
                vert += f'<path d="M{x+92+k*2} {652+k*3} q{12+k*4} -{14+k*5} {26+k*3} -{8+k*4}" stroke="#F4F1E4" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>'
                vert += f'<path d="M{x-96-k*2} {788-k*3} q-{12+k*4} {12+k*5} -{24+k*3} {6+k*4}" stroke="#F4F1E4" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>'
        else:
            vert += stroke(f'M{x} -40 V1400')
    hor = ''.join(stroke(f'M-40 {y} H1120') for y in hy)
    over = ''.join(stroke(f'M{x} {y-34} V{y+34}') for i, x in enumerate(vx) for j, y in enumerate(hy) if (i + j) % 2 == 0 and not (i == BR and 600 < y < 840))
    body = f'''
<defs><radialGradient id="bg52" cx="50%" cy="46%" r="70%"><stop offset="0" stop-color="#1A6B49"/><stop offset="1" stop-color="#04180F"/></radialGradient>
<linearGradient id="tp52" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120B" stop-opacity=".97"/><stop offset=".6" stop-color="#03120B" stop-opacity=".9"/><stop offset="1" stop-color="#03120B" stop-opacity="0"/></linearGradient><linearGradient id="bt52" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120B" stop-opacity="0"/><stop offset="1" stop-color="#03120B" stop-opacity=".95"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg52)"/>
{ball('s', 560, 720, 360, rot=-24, blur=7)}
<g>{vert}{hor}{over}</g>
<rect width="{W}" height="520" fill="url(#tp52)"/>
{tag('STRING BREAK', color='#F7EBD6')}
{headline(META['lines'], y=290, size=56, colors=C['cream'], ls=3)}
<rect y="1080" width="{W}" height="270" fill="url(#bt52)"/>
{wordmark(1268, '#fff', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
