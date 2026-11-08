from lib import *
from poet import scholar, vtext, seal, latin, SHIQING, YUEBAI, ZHU

META = dict(
    id=207, slug='poet-libai', title='举拍邀明月', lines=['举拍邀明月'],
    style=['古风', '诗人', '现代版式', '青绿'], tone='亮色', demo=False,
    concept='李白《月下独酌》改一个字：举杯邀明月 → 举拍邀明月。石青到南伴绿的夜空，一轮大月亮压到画面右边出血，月面上淡淡两道网球缝；崖顶一个穿白袍的小人举拍向月，地上拖着一道长影——人、影、月，对影成三人。左边竖排大字，朱印，细线和小英文是现代的部分。',
    use='诗人打球系列 · 李白；独自打球 / 找球友主题',
)


def svg():
    p = ['<defs><linearGradient id="sky207" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173F52"/><stop offset=".55" stop-color="#1F5E62"/><stop offset="1" stop-color="#2A7C66"/></linearGradient>'
         '<radialGradient id="glow207"><stop offset=".6" stop-color="#FFF6D6" stop-opacity=".45"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient>'
         '<radialGradient id="moon207" cx=".4" cy=".38" r=".7"><stop offset="0" stop-color="#FFF9E4"/><stop offset="1" stop-color="#F1E3B4"/></radialGradient>'
         '<clipPath id="mc207"><circle cx="760" cy="500" r="360"/></clipPath></defs>',
         '<rect width="1080" height="1350" fill="url(#sky207)"/>',
         '<circle cx="760" cy="500" r="520" fill="url(#glow207)"/>',
         '<circle cx="760" cy="500" r="360" fill="url(#moon207)"/>',
         '<g clip-path="url(#mc207)" fill="none" stroke="#E6D59E" stroke-width="16" stroke-linecap="round" opacity=".7">'
         '<path d="M420 360 Q700 470 560 860"/><path d="M960 150 Q820 540 1110 650"/></g>']
    # 远山：几道平涂石绿
    p.append('<path d="M0 1010 L180 930 L330 990 L520 900 L700 980 L880 920 L1080 990 V1350 H0Z" fill="#2F8A6E" opacity=".75"/>')
    p.append('<path d="M0 1080 L240 1020 L470 1070 L760 1000 L1080 1060 V1350 H0Z" fill="#1F7A58"/>')
    # 崖顶：从右下伸出的一块平台
    p.append('<path d="M1080 1110 L560 1110 Q520 1112 500 1140 L470 1350 H1080Z" fill="#176B4D"/><path d="M560 1110 H1080" stroke="#7FD3A6" stroke-width="3"/>')
    p.append('<path d="M0 1200 Q260 1170 470 1230 L460 1350 H0Z" fill="#0E5139"/>')
    # 人和影
    p.append('<path d="M640 1110 L940 1150 L950 1138 L660 1104Z" fill="#0B3B2A" opacity=".55"/>')
    p.append(scholar(640, 1110, 1.25, robe='#F3EEE0', sash='#C23A2B', flip=1, arm='up', wind=.5))
    # 字
    p.append(vtext('举拍邀明月', 150, 230, 112, '#FFF6DA', 1.12, 700))
    p.append(vtext('举杯邀明月，对影成三人', 258, 240, 30, '#CFE3D8', 1.5, 500))
    p.append(seal(127, 890, 46, '南伴'))
    p.append('<path d="M300 230 V860" stroke="#CFE3D8" stroke-width="1" opacity=".5"/>')
    p.append(f'<text x="330" y="1262" font-family="{SERIF}" font-weight="600" font-size="38" letter-spacing="6" fill="#FFF6DA">独酌不如约球</text>')
    p.append(latin('诗人打球 · 壹 / 李白《月下独酌》', 332, 1300, '#9FD3B8', 18, ls=3))
    p.append(latin('INVITE THE MOON TO A RALLY', 332, 1328, '#7FBFA2', 12, ls=5))
    p.append(f'<g transform="translate(960 1268)"><circle cx="-158" cy="-8" r="9" fill="#C6EA3D"/><circle cx="-142" cy="2" r="6" fill="#C6EA3D" stroke="#176B4D" stroke-width="2"/>'
             f'<text x="0" y="6" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="28" letter-spacing="8" fill="#FFF6DA">南伴球</text></g>')
    return page(''.join(p))
