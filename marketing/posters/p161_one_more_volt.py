from lib import *
from athlete import server, rim

META = dict(
    id=161, slug='one-more-volt', title='再来一球（反色）', lines=['再来一球。'],
    style=['运动海报', '高对比', '大字', '单色'], tone='亮色', demo=False,
    concept='160 的反色版：整张铺满品牌的荧光黄绿，四个巨大的黑字「再来一球」，人是纯黑剪影站在字前，球变成白色——像运动品牌的配色款海报，一眼就是南伴球的颜色',
    use='品牌主视觉的配色款；和 160 成对使用',
)


def svg():
    p = [f'<rect width="{W}" height="{H}" fill="#C6EA3D"/>',
         '<defs><filter id="gr161"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="17"/><feColorMatrix type="saturate" values="0"/></filter></defs>']
    big = f'font-family="{SANS}" font-weight="900" font-size="440" letter-spacing="-20" fill="#0B3B2A"'
    p.append(f'<g transform="translate(36 0) scale(.9 1)"><text x="0" y="560" {big}>再来</text><text x="0" y="1010" {big}>一球</text></g>')
    p.append(f'<g transform="translate(-10 0)" opacity=".0">{server("#0B3B2A")}</g>')
    p.append(rim(server, 8, -5, light='#E8FA88', dark='#0A0A0A'))
    p.append('<circle cx="706" cy="196" r="26" fill="#FFFFFF"/><path d="M688 178 C700 190 700 202 688 214" stroke="#C6EA3D" stroke-width="4" fill="none"/>')
    p.append('<rect width="1080" height="1350" filter="url(#gr161)" opacity=".1" style="mix-blend-mode:multiply"/>')
    p.append(f'<text x="64" y="1150" font-family="{SANS}" font-weight="900" font-size="34" letter-spacing="6" fill="#0A0A0A">ONE MORE.</text>')
    p.append(f'<text x="64" y="1188" font-family="{SANS}" font-size="15" letter-spacing="6" fill="#0A0A0A" opacity=".6">MELBOURNE · COURT 3 · 9:47 PM</text>')
    p.append('<rect y="1220" width="1080" height="130" fill="#0A0A0A"/>')
    p.append(wordmark(1280, '#fff', sub=False))
    return page(''.join(p))
