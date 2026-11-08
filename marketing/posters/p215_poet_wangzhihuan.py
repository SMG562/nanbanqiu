from lib import *
from poet import scholar, vtext, seal, footer, DAI
from song import roof

META = dict(
    id=215, slug='poet-wangzhihuan', title='更上一层楼', lines=['欲穷千里目', '更上一层楼'],
    style=['古风', '诗人', '台阶', '现代版式'], tone='亮色', demo=False,
    concept='王之涣《登鹳雀楼》：白日依山尽，黄河入海流。欲穷千里目，更上一层楼。五层南伴绿的球场像台阶一样往右上叠，侧面标着 2.0 / 2.5 / 3.0 / 3.5 / 4.0 的水平；顶层一座小楼，楼后一轮落日；远处黄河一条金带流向天边。一个人提着拍正往上走。',
    use='诗人打球系列 · 王之涣；按水平进阶 / 越打越好主题',
)


def svg():
    p = ['<defs><linearGradient id="sky215" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7C77E"/><stop offset=".7" stop-color="#FBE6BC"/><stop offset="1" stop-color="#FDF2D8"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky215)"/>']
    p.append('<circle cx="930" cy="440" r="130" fill="#F28A3A" opacity=".9"/><circle cx="930" cy="440" r="170" fill="#F7A85A" opacity=".25"/>')
    # 远山 + 黄河
    p.append('<path d="M0 860 L140 760 L260 820 L420 720 L560 800 L700 730 L860 790 L1080 700 V980 H0Z" fill="#8FC9A6" opacity=".8"/>')
    p.append('<path d="M0 920 L200 850 L380 900 L600 840 L820 890 L1080 830 V1350 H0Z" fill="#6CB890"/>')
    p.append('<path d="M-20 1180 Q160 1090 120 1010 Q90 950 260 920 Q420 892 600 880 Q800 868 1100 860" stroke="#F2C66A" stroke-width="36" fill="none" stroke-linecap="round"/>'
             '<path d="M-20 1180 Q160 1090 120 1010 Q90 950 260 920 Q420 892 600 880 Q800 868 1100 860" stroke="#FBE3A6" stroke-width="6" fill="none" opacity=".8"/>')
    # 五层台阶球场：斜轴测
    w, d, dx, h = 250, 60, 52, 54
    levels = ['2.0', '2.5', '3.0', '3.5', '4.0']
    for i in range(4, -1, -1):
        lv = levels[i]
        x, y = 330 + i * 120, 1120 - i * 120
        g = ['#4DB27F', '#3FA474', '#2F9A6A', '#25875C', '#1F7A52'][i]
        p.append(f'<path d="M{x} {y} H{x + w} V1350 H{x}Z" fill="#176B4D"/>')
        p.append(f'<path d="M{x} {y} H{x + w} V{y + h} H{x}Z" fill="#14603F"/>')
        p.append(f'<path d="M{x + w} {y} L{x + w + dx} {y - d} V1350 L{x + w} 1350Z" fill="#0E5139"/>')
        p.append(f'<path d="M{x} {y} L{x + dx} {y - d} H{x + w + dx} L{x + w} {y}Z" fill="{g}"/>')
        p.append(f'<path d="M{x + 18} {y - 6} L{x + dx - 2} {y - d + 8} H{x + w + dx - 22} L{x + w - 18} {y - 6}Z M{x + w / 2 + dx / 2:.0f} {y - d + 8} L{x + w / 2 - 4:.0f} {y - 6}" stroke="#F4EED8" stroke-width="2.4" fill="none" opacity=".85"/>')
        p.append(f'<text x="{x + 20}" y="{y + 40}" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="2" fill="#C6EA3D">{lv}</text>')
    # 顶层小楼
    tx, ty = 330 + 4 * 120 + 150, 1120 - 4 * 120 - 26
    p.append(f'<rect x="{tx - 52}" y="{ty - 70}" width="10" height="70" fill="#9A3A2A"/><rect x="{tx + 42}" y="{ty - 70}" width="10" height="70" fill="#9A3A2A"/>'
             f'<rect x="{tx - 58}" y="{ty - 6}" width="116" height="8" fill="#6A4E36"/>')
    p.append(roof(tx, ty - 124, 170, 56, gold='#2F5E5A', dark='#1E3E3A', ridge='#22443F'))
    # 往上走的人
    p.append(scholar(330 + 2 * 120 + 110, 1120 - 2 * 120 - 26, 1.05, robe='#F3EEE0', sash='#C23A2B', flip=1, arm='down', wind=.4))
    p.append('<path d="M0 1200 Q300 1188 560 1204 V1350 H0Z" fill="#176B4D"/><rect y="1220" width="1080" height="130" fill="#176B4D"/>')
    # 字
    p.append(vtext('更上一层楼', 150, 190, 104, DAI, 1.12, 700))
    p.append(vtext('欲穷千里目', 256, 206, 30, '#6A4E36', 1.5, 500))
    p.append(seal(236, 460, 40, '南伴'))
    footer(p, '每打一局，都往上走一层', '诗人打球 · 玖 / 王之涣《登鹳雀楼》', 'ONE MORE FLOOR, ONE MORE LEVEL')
    return page(''.join(p))
