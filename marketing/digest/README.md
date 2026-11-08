# 每日球局海报 · 原型（ADR 0009 待定）

用**演示数据**画的两张样稿（3:4，1080×1440，2 倍渲染），只给所有者看效果，**还没接数据库、定时任务和后台**。

- `timetable.py`：明日时刻表（4–10 局）· `treasure.py`：明日寻宝图（>10 局）· `common.py`：尺寸、二维码、日期
- 出图：`python3 marketing/digest/render.py timetable treasure`（输出到 `$DIGEST_OUT`，默认 `/tmp/digest_out`）
- 依赖：Playwright（Python）+ Noto CJK 字体（同 `marketing/build.py`），另需 `segno`（画二维码）、`zxing-cpp`（解码校验二维码）——新依赖，要在 ADR 0009 拍板时一起批
- 自动检查：文字出界 / 互相压住（复用 build.py 的检查）、二维码解码后与网址一致
- 地图底图是手描近似（示意），正式版按 ADR 从 OpenStreetMap 简化生成；球场坐标来自 `tools/venue_geo.json`
