from lib import *
import people
from people import person
from moment import frame

META = dict(
    id=228, slug='moment-one-second', title='还有一秒。', lines=['还有一秒。'],
    style=['瞬间', '夜场', '明亮', '幽默'], tone='亮色', demo=False,
    concept='打到夜场快关灯，但画的是关灯前亮堂堂的最后一秒：蓝调的天、灯把球场照得透亮；近处灯杆上的定时器显示 21:59:59、写着 22:00 自动关灯；场上两个人正打得起劲，记分牌 40 平，球在半空。笑点在心里那句：这一分，打得完吗？',
    use='瞬间系列；夜场 / 打球的热情 / 早点约场',
)

people.POSES['swing'] = dict(hip=(0, -160), neck=(-8, -282), head=(-10, -314), fk=(40, -80), ff=(70, 0), bk=(-34, -80), bf=(-60, -4),
                             fs=(4, -272), fe=(40, -300), fh=(70, -330), bs=(-14, -272), be=(-44, -240), bh=(-60, -210))
people.POSES['ready'] = dict(hip=(0, -140), neck=(6, -260), head=(8, -292), fk=(40, -70), ff=(56, 0), bk=(-34, -70), bf=(-52, 0),
                             fs=(14, -252), fe=(40, -210), fh=(60, -190), bs=(-4, -252), be=(20, -206), bh=(48, -192))


def svg():
    p = ['<defs><linearGradient id="sky228" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3F78BE"/><stop offset=".6" stop-color="#8FBDE6"/><stop offset="1" stop-color="#F7D29C"/></linearGradient>'
         '<radialGradient id="lamp228" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFFBEA" stop-opacity=".95"/><stop offset=".35" stop-color="#FFF4D2" stop-opacity=".45"/><stop offset="1" stop-color="#FFF4D2" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="beam228" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8E0" stop-opacity=".45"/><stop offset="1" stop-color="#FFF8E0" stop-opacity=".08"/></linearGradient>'
         '<linearGradient id="pole228" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0E5139"/><stop offset=".4" stop-color="#2F8A6E"/><stop offset="1" stop-color="#14603F"/></linearGradient>'
         '<filter id="bl228"><feGaussianBlur stdDeviation="1.4"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#sky228)"/>']
    # 远处树线（亮的中绿，不是黑剪影）+ 城市灯点
    p.append('<path d="M0 600 Q80 560 160 584 Q260 540 360 576 Q470 548 580 578 Q700 540 820 576 Q950 548 1080 572 V660 H0Z" fill="#4DA67A"/>')
    # 球场：外圈 + 场地 + 白线
    p.append('<path d="M0 640 H1080 V1350 H0Z" fill="#2F8A6E"/>')
    p.append('<path d="M330 650 L790 650 L1000 1070 L120 1070Z" fill="#45AE7A"/>')
    p.append('<path d="M340 656 L780 656 L988 1064 L132 1064Z M560 656 V1064 M290 752 H830 M190 960 H930" stroke="#FFFFFF" stroke-width="4" fill="none"/>')
    # 球网
    p.append('<path d="M232 846 H888" stroke="#FFFFFF" stroke-width="7"/><path d="M232 846 V806 H888 V846" stroke="#FFFFFF" stroke-width="2" fill="#FFFFFF" fill-opacity=".18"/>'
             '<g stroke="#FFFFFF" stroke-width="1" opacity=".35">' + ''.join(f'<path d="M{x} 808 V846"/>' for x in range(236, 888, 14)) + '</g>')
    # 灯光照亮整块场
    p.append('<path d="M850 170 L950 170 L1060 1120 L40 1120Z" fill="url(#beam228)"/>')
    # 记分牌（远处围网上）40 : 40
    p.append('<rect x="110" y="560" width="150" height="76" rx="6" fill="#176B4D"/>'
             '<rect x="122" y="570" width="58" height="56" rx="4" fill="#FFFFFF"/><rect x="190" y="570" width="58" height="56" rx="4" fill="#FFFFFF"/>'
             f'<text x="151" y="612" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="38" fill="#176B4D">40</text>'
             f'<text x="219" y="612" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="38" fill="#176B4D">40</text>')
    # 两个人：对面准备接，近处正手挥出去
    p.append(f'<g filter="url(#bl228)">{person(600, 740, .34, "ready", flip=-1, skin=1, hair=0, top="#F28A5B", bottom="#2E3A34", racket_hand="fh")}</g>')
    p.append('<path d="M410 960 Q470 640 556 700" stroke="#FFFFFF" stroke-width="2.4" stroke-dasharray="4 8" fill="none" opacity=".8"/>')
    p.append('<circle cx="556" cy="702" r="14" fill="#DDF35A"/><path d="M547 692 q9 10 2 21 M565 692 q-9 10 -2 21" stroke="#FFFFFF" stroke-width="2" fill="none"/>')
    p.append('<ellipse cx="380" cy="1086" rx="90" ry="12" fill="#14603F" opacity=".5"/>')
    p.append(person(380, 1080, .66, "swing", flip=1, skin=0, hair=1, top="#FFFFFF", bottom="#1E4E62", racket_hand="fh", hairstyle="cap"))
    # 主角：灯杆 + 灯头 + 定时器
    p.append('<rect x="883" y="160" width="34" height="980" fill="url(#pole228)"/>')
    p.append('<circle cx="900" cy="174" r="200" fill="url(#lamp228)"/><rect x="840" y="156" width="120" height="34" rx="8" fill="#E9EEF0"/><rect x="850" y="180" width="100" height="12" rx="4" fill="#FFFBEA"/>')
    p.append('<rect x="774" y="430" width="252" height="330" rx="22" fill="#F7F5EE"/><rect x="774" y="430" width="252" height="330" rx="22" fill="none" stroke="#176B4D" stroke-width="6"/>'
             f'<text x="900" y="486" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="6" fill="#176B4D">球场灯</text>'
             '<rect x="798" y="508" width="204" height="96" rx="10" fill="#E6F5B2"/><rect x="798" y="508" width="204" height="96" rx="10" fill="none" stroke="#B9D86A" stroke-width="3"/>'
             f'<text x="900" y="574" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="46" fill="#0E5139" style="font-variant-numeric:tabular-nums">21:59:59</text>'
             f'<text x="900" y="644" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="20" fill="#4A5A50">22:00 自动关灯</text>'
             '<circle cx="900" cy="700" r="20" fill="#F28A3A"/><circle cx="900" cy="700" r="9" fill="#FFD0A8"/>'
             '<circle cx="796" cy="452" r="5" fill="#C9CFC6"/><circle cx="1004" cy="452" r="5" fill="#C9CFC6"/><circle cx="796" cy="738" r="5" fill="#C9CFC6"/><circle cx="1004" cy="738" r="5" fill="#C9CFC6"/>')
    frame(p, 7, '还有一秒。', '40 平。这一分，打得完吗？', '想打得尽兴，就约早一点的场。', ink='#FFFFFF', sub_c='#E6F4EC', info_c='#BFE6CF', mark_c='#FFFFFF', total=None)
    p[-5] = p[-5].replace('#BFE6CF', '#FFFFFF')
    return page(''.join(p))
