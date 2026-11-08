import os, sys, importlib, tempfile
sys_path_fix = None
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common
from playwright.sync_api import sync_playwright
from PIL import Image
import zxingcpp
OUT = os.environ.get('DIGEST_OUT', '/tmp/digest_out'); os.makedirs(OUT, exist_ok=True)
CHECK = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build.py')).read().split("TEXT_CHECK = '''")[1].split("'''")[0].replace('H = 1350', 'H = 1440')
with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium'); pg = b.new_page(viewport={'width': 1080, 'height': 1440}, device_scale_factor=2)
    for name in sys.argv[1:]:
        h = os.path.join(tmp, name + '.html'); open(h, 'w').write(importlib.import_module(name).svg())
        pg.goto('file://' + h); pg.wait_for_timeout(400)
        png = os.path.join(OUT, name + '@2x.png'); pg.screenshot(path=png)
        warn = pg.evaluate(CHECK); im = Image.open(png).convert('RGB')
        im.resize((1080, 1440), Image.LANCZOS).save(os.path.join(OUT, name + '.jpg'), quality=92, subsampling=0)
        qrs = [r.text for r in zxingcpp.read_barcodes(im)]
        print(name, im.size, '文字检查:', warn or '无问题', '| 二维码:', qrs or '无', '| 对得上' if not qrs or qrs[0] == common.URL else '| ✗ 网址不对')
    b.close()
