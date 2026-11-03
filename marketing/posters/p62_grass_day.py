from four_times import *

META = dict(
    id=62, slug='grass-day', title='同一块假草，四个时间', lines=['同一块假草，', '一天四个样。'],
    style=['系列', '色块', '场地质感'], tone='深色', demo=False,
    concept='假草场同一机位四格：清晨露水、正午修剪条纹、傍晚底线秃一块、深夜球掉进草里；每格一句小毛病',
    use='假草 / 场地系列；打过草场的人都懂',
)


def svg():
    return render('grass', 'g', META['lines'], 'GRASS · 4 TIMES', '#0B3B2A', '#F7EBD6', '#C6EA3D',
                  ['草上有露，鞋先湿了。', '刚修过，味道很冲。', '底线那块，早秃了。', '球掉进草里，找不到。'])
