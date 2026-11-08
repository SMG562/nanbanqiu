from lib import *
from mao3 import figure3, DOWN_L, DOWN_R
from variety import INK, block, burst, badge, bubble, arrow, confetti

META = dict(
    id=202, slug='variety-show', title='约球大作战 第1期', lines=['约球大作战'],
    style=['综艺风', '角色', '贴纸', '明亮'], tone='亮色', demo=False,
    concept='年轻综艺的节目海报：南伴绿渐变底上一大块黄色爆炸星，「约球大作战」立体厚字压在上面，「第 1 期」徽章、「新手友好」「7 天内都能约」贴纸、手绘箭头和彩带满版；小毛和小绒一左一右站在前面，各说一句：「我先发球！」「接得住吗？」',
    use='节目式宣传 / 社群活动预告；小毛小绒出场',
)


def svg():
    r = random.Random(202)
    p = ['<defs><linearGradient id="bg202" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2FA36B"/><stop offset="1" stop-color="#176B4D"/></linearGradient>'
         '<pattern id="st202" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="20" height="40" fill="#C6EA3D" opacity=".10"/></pattern></defs>',
         '<rect width="1080" height="1350" fill="url(#bg202)"/>', '<rect width="1080" height="1350" fill="url(#st202)"/>']
    p.append(burst(540, 420, 400, '#FFE45C', 18, .8, 5))
    p.append(badge(80, 120, 220, 76, '第 1 期', '#3EC6FF', size=36, rot=-8))
    p.append(block('约球', 210, 410, 220, side='#FF5A7A', depth=18, rot=-6))
    p.append(block('大作战', 160, 640, 220, side='#8A6CFF', depth=18, rot=-6))
    p.append(badge(720, 150, 260, 70, '新手友好', '#C6EA3D', color=INK, size=32, rot=8))
    p.append(badge(700, 660, 300, 70, '7 天内都能约', '#FF8A3D', size=30, rot=6))
    p.append(arrow(930, 240, 880, 330))
    # 小毛、小绒
    gy = 1240
    p.append(figure3('m', 320, 0, 150, 'racket', 'happy', gy=gy))
    p.append(figure3('r', 780, 0, 150, 'cheer', 'cheer', gy=gy, char='rong'))
    p.append(bubble(90, 790, 300, 90, '我先发球！', 'left', size=36))
    p.append(bubble(640, 770, 300, 86, '接得住吗？', 'right', size=36))
    p.append(confetti(r, 50, (20, 20, 1060, 800)))
    p.append(f'<rect y="1272" width="1080" height="78" fill="#0B3B2A"/>')
    p.append(wordmark(1300, '#fff', sub=False))
    return page(''.join(p))
