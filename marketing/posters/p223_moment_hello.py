from lib import *
from moment import frame, racket

META = dict(
    id=223, slug='moment-hello', title='你好。', lines=['你好。'],
    style=['瞬间', '静物', '极简', '午后'], tone='亮色', demo=False,
    concept='第一次和陌生球友约球：平视的机位贴着网柱，两支不同颜色的球拍从两边斜靠在同一根网柱上，像刚握过手；午后的光把两道拍影拉长，在南伴绿的场地上碰到一起。主角只有网柱和两支拍，人不出场。',
    use='瞬间系列 · 02；第一次约球 / 认识新球友',
)


def svg():
    p = ['<defs><linearGradient id="sky223" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E7C8"/><stop offset="1" stop-color="#FBF3E2"/></linearGradient>'
         '<linearGradient id="ct223" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F8A6E"/><stop offset="1" stop-color="#176B4D"/></linearGradient>'
         '<linearGradient id="post223" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0E5139"/><stop offset=".35" stop-color="#2F8A6E"/><stop offset="1" stop-color="#0B3B2A"/></linearGradient>'
         '<pattern id="mesh223" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 0 L22 22 M22 0 L0 22" stroke="#1E2A22" stroke-width="1.6" opacity=".55"/></pattern>'
         '<filter id="sh223" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#sky223)"/>']
    # 远处：围网 + 一排树
    p.append('<path d="M0 640 Q120 560 240 600 Q360 540 480 590 Q620 530 760 584 Q900 540 1080 590 V720 H0Z" fill="#6CC597" opacity=".8"/>')
    p.append('<rect y="640" width="1080" height="100" fill="#3FA474" opacity=".55"/>')
    p.append('<g stroke="#0E5139" stroke-width="1" opacity=".25">' + ''.join(f'<path d="M{x} 600 V740"/>' for x in range(0, 1080, 24)) + '</g>')
    # 场地
    p.append('<path d="M0 740 H1080 V1350 H0Z" fill="url(#ct223)"/>')
    p.append('<path d="M0 800 H1080" stroke="#F4EED8" stroke-width="6" opacity=".85"/>')
    # 球网（左右两边）
    p.append('<path d="M0 650 Q270 668 520 640 V880 H0Z" fill="url(#mesh223)"/><path d="M560 640 Q810 668 1080 650 V880 H560Z" fill="url(#mesh223)"/>')
    p.append('<path d="M0 646 Q270 664 520 636" stroke="#FFFFFF" stroke-width="16" fill="none"/><path d="M560 636 Q810 664 1080 646" stroke="#FFFFFF" stroke-width="16" fill="none"/>')
    # 影子：两支拍的影子向右后方拉长，在地上碰在一起
    p.append('<g opacity=".32" filter="url(#sh223)"><path d="M430 960 L840 1010 L900 1040 L880 1060 L820 1040 L430 975Z" fill="#06261A"/>'
             '<path d="M650 960 L860 1000 L920 1030 L900 1050 L840 1030 L650 975Z" fill="#06261A"/><path d="M520 950 L960 1000 V1018 L520 966Z" fill="#06261A"/></g>')
    # 网柱
    p.append('<rect x="512" y="600" width="56" height="360" rx="8" fill="url(#post223)"/><rect x="504" y="588" width="72" height="22" rx="8" fill="#0B3B2A"/>'
             '<circle cx="540" cy="700" r="14" fill="#0B3B2A"/><path d="M540 700 l38 18" stroke="#0B3B2A" stroke-width="8" stroke-linecap="round"/>')
    p.append('<ellipse cx="540" cy="960" rx="60" ry="10" fill="#06261A" opacity=".4"/>')
    # 两支拍：从两边斜靠在网柱上
    p.append(racket(330, 960, 22, frame='#F4F1E8', grip='#1E2A22', s=1.0, sid='l'))
    p.append(racket(760, 960, -22, frame='#C6EA3D', grip='#F4F1E8', s=1.0, sid='r'))
    frame(p, 2, '你好。', '第一次约的球友，比想象中好聊。', '按水平找到合适的人，先打一局再说。', ink='#FFFFFF', sub_c='#D7EEDF', info_c='#A9D6BC', mark_c='#FFFFFF')
    p[-5] = p[-5].replace('#A9D6BC', '#6A7A70')   # 左上编号在浅色天上，用深一点的灰绿
    return page(''.join(p))
