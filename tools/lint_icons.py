#!/usr/bin/env python3
"""marketing/icons 下 svg 的轻量检查（11-04）。图稿提交不跑完整测试，只跑这个，几秒出结果。

检查：能解析成 XML、根元素是 svg、有 viewBox、没有脚本 / 事件属性 / 外部链接、单个文件不超过上限。
用法：python3 tools/lint_icons.py [目录，默认 marketing/icons]
有问题时逐条列出并以 1 退出；GitHub 上同时写成 ::error 注解。
"""
import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'marketing/icons'
MAX_BYTES = 100 * 1024   # 现有最大约 11.7KB，留足余量；超过多半是误嵌了位图
RISKY = re.compile(r'<script|\son\w+\s*=|(?:xlink:)?href\s*=\s*["\']\s*(?:https?:|javascript:|data:text)', re.I)

problems = []
files = []
for d, _, names in os.walk(ROOT):
    for n in names:
        if n.lower().endswith('.svg'):
            files.append(os.path.join(d, n))
files.sort()

for f in files:
    try:
        text = open(f, encoding='utf-8').read()
    except UnicodeDecodeError:
        problems.append((f, '不是 UTF-8 文本'))
        continue
    size = len(text.encode('utf-8'))
    if size > MAX_BYTES:
        problems.append((f, f'体积 {size // 1024}KB，超过 {MAX_BYTES // 1024}KB 上限'))
    try:
        root = ET.fromstring(text)
    except ET.ParseError as e:
        problems.append((f, f'XML 解析失败：{e}'))
        continue
    if root.tag.split('}')[-1] != 'svg':
        problems.append((f, f'根元素是 {root.tag}，不是 svg'))
        continue
    if 'viewBox' not in root.attrib:
        problems.append((f, '缺 viewBox（缩放时会变形或被裁掉）'))
    if RISKY.search(text):
        problems.append((f, '含脚本、事件属性或外部链接'))

for f, why in problems:
    print(f'::error file={f}::{why}' if os.environ.get('GITHUB_ACTIONS') else f'FAIL {f}: {why}')
print(f'icons-lint：{len(files)} 个 svg，问题 {len(problems)} 个')
sys.exit(1 if problems else 0)
