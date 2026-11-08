from lib import *
from picto import picto
from han import POP

META = dict(
    id=158, slug='olympic-medal', title='咖啡管够', lines=['奖牌没有，', '咖啡管够。'],
    style=['运动会风', '奖牌', '极简', '幽默'], tone='亮色', demo=False,
    concept='一枚大金牌从画面顶上垂下来，彩色条纹的挂带；金牌正面刻着一个几何小人在发球，背景是一颗网球的缝线；金牌旁边一只外带咖啡杯，杯套上也印着同一个小人——我们发的奖，是一杯咖啡',
    use='周末小比赛 / 社群活动；轻松、不功利',
)


def svg():
    C = POP
    p = [f'<rect width="{W}" height="{H}" fill="{C["sky"]}"/>',
         f'<rect y="760" width="{W}" height="590" fill="{C["butter"]}"/>']
    stripes = [C['coral'], C['butter'], C['mint'], C['butter'], C['coral']]
    for i, c in enumerate(stripes):                                                                            # V 形挂带
        p.append(f'<path d="M{300 + i*30} -10 L{330 + i*30} -10 L{480 + i*12} 560 L{450 + i*12} 560Z" fill="{c}"/>')
        p.append(f'<path d="M{780 - i*30} -10 L{750 - i*30} -10 L{600 - i*12} 560 L{630 - i*12} 560Z" fill="{c}"/>')
    p.append('<defs><radialGradient id="gd158" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFE9A0"/><stop offset=".6" stop-color="#F2C24A"/><stop offset="1" stop-color="#C8922A"/></radialGradient></defs>')
    p.append('<circle cx="540" cy="720" r="230" fill="url(#gd158)"/><circle cx="540" cy="720" r="196" fill="none" stroke="#B8821E" stroke-width="6"/>')
    p.append('<path d="M410 560 C470 650 470 790 410 880 M670 560 C610 650 610 790 670 880" stroke="#E8B23A" stroke-width="14" fill="none" stroke-linecap="round"/>')
    p.append(picto(540, 760, 1.25, 'serve', '#8A5E12'))
    p.append('<circle cx="568" cy="580" r="14" fill="#C6EA3D" stroke="#8A5E12" stroke-width="3"/>')
    # 外带咖啡杯
    p.append(f'<path d="M820 900 L940 900 L924 1150 L836 1150Z" fill="#FFFFFF"/><rect x="810" y="880" width="140" height="26" rx="8" fill="{C["navy"]}"/>')
    p.append(f'<rect x="828" y="970" width="104" height="90" fill="{C["coral"]}"/>')
    p.append(picto(880, 1030, .38, 'serve', '#FFFFFF', w=22))
    for k in range(3):
        p.append(f'<path d="M{858 + k*22} 860 c-10 -20 10 -30 0 -50" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>')
    p.append(tag('THE PRIZE', y=120, color=C['navy'], rule=C['coral'], op=.85))
    p.append(f'<g>{headline(META["lines"], x=84, y=1036, size=52, colors=(C["navy"], C["coral"]), lh=70, weight=900)}</g>')
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
