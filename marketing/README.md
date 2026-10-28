# marketing/ 宣传物料

海报源文件（`posters/pNN_*.py`）、绘图工具（`lib.py`）、出图脚本（`build.py`）、出图结果（`img/` 大图、`thumb/` 缩略图，webp）和清单（`posters.json`，由 build.py 登记）。

- 预览站页面：https://nanbanqiu-preview.pages.dev/materials.html（手机能看，能存大图）
- 怎么做新海报：**读 `.claude/skills/nanbanqiu-poster/SKILL.md`**（品牌规则、模板、lib 速查、流程；不用通读本目录的代码）
- 常用：`python3 marketing/build.py --list` 看已有的；`--only 21` 只画一张；`--check` 核对一致性
- 高清 PNG（1620×2025）不进仓库：`build.py --hires <文件夹>`
