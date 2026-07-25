"""
캐릭터별 결과 공유 카드(1200x630) 생성.
- OG 링크 미리보기 썸네일 + '이미지 저장' 겸용
- 출력: public/cards/{2자리}.png
"""
import json, sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
FONT_TTC = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
ROOT = "."

# ttc에서 굵은/중간 웨이트 인덱스 탐색
def pick_weights():
    bold_idx, med_idx = 0, 0
    for i in range(12):
        try:
            f = ImageFont.truetype(FONT_TTC, 40, index=i)
            style = f.getname()[1].lower()
        except Exception:
            break
        if any(k in style for k in ("heavy", "extrabold", "black")) and not bold_idx:
            bold_idx = i
        if "bold" in style and "semi" not in style and bold_idx == 0:
            bold_idx = i
        if "medium" in style or "regular" in style:
            med_idx = i
    return bold_idx or 0, med_idx or 0

BOLD_I, MED_I = pick_weights()
def font(size, bold=True):
    return ImageFont.truetype(FONT_TTC, size, index=(BOLD_I if bold else MED_I))

def vgradient(top, bot):
    base = Image.new("RGB", (W, H), top)
    top_rgb, bot_rgb = top, bot
    for y in range(H):
        t = y / (H - 1)
        r = int(top_rgb[0] + (bot_rgb[0] - top_rgb[0]) * t)
        g = int(top_rgb[1] + (bot_rgb[1] - top_rgb[1]) * t)
        b = int(top_rgb[2] + (bot_rgb[2] - top_rgb[2]) * t)
        ImageDraw.Draw(base).line([(0, y), (W, y)], fill=(r, g, b))
    return base.convert("RGBA")

def paste_shadow(canvas, img, xy, blur=18, offset=(0, 12), alpha=70):
    from PIL import ImageFilter
    x, y = xy
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    a = img.split()[3].point(lambda p: min(p, alpha))
    solid = Image.new("RGBA", img.size, (60, 40, 20, 255))
    solid.putalpha(a)
    sh.paste(solid, (x + offset[0], y + offset[1]), solid)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(sh)
    canvas.alpha_composite(img.convert("RGBA"), (x, y))

def make_card(idx, name, tagline, out_path):
    canvas = vgradient((255, 247, 222), (255, 233, 241))  # 크림 → 연핑크

    # 로고
    logo = Image.open(f"{ROOT}/public/logo.png").convert("RGBA")
    lw = 200
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    canvas.alpha_composite(logo, (64, 54))

    # 캐릭터 프로필 (우측)
    ch = Image.open(f"{ROOT}/public/characters/{idx:02d}.png").convert("RGBA")
    csize = 360
    ch = ch.resize((csize, int(ch.height * csize / ch.width)), Image.LANCZOS)
    cx = W - csize - 90
    cy = (H - ch.height) // 2 + 10
    paste_shadow(canvas, ch, (cx, cy))

    d = ImageDraw.Draw(canvas)
    brown = (91, 59, 30)
    orange = (224, 145, 43)
    muted = (169, 143, 112)

    tx = 72
    d.text((tx, 210), "나는", font=font(50, False), fill=brown)
    # 이름 (길면 크기 축소)
    nsize = 118
    nf = font(nsize)
    while d.textlength(name + "!", font=nf) > (cx - tx - 30) and nsize > 60:
        nsize -= 6
        nf = font(nsize)
    d.text((tx - 3, 262), name + "!", font=nf, fill=brown)

    # 태그라인 (폭 넘으면 자름)
    ty = 262 + nsize + 22
    tf = font(34, False)
    tag = tagline
    while d.textlength(tag, font=tf) > (cx - tx - 20) and len(tag) > 4:
        tag = tag[:-1]
    if tag != tagline:
        tag = tag[:-1] + "…"
    d.text((tx, ty), tag, font=tf, fill=orange)

    d.text((tx, H - 74), "나와 닮은 코코비 캐릭터 찾기", font=font(28, False), fill=muted)

    canvas.convert("RGB").save(out_path)
    print(f"카드 저장: {out_path}  (이름 {name}, weight bold={BOLD_I}/med={MED_I})")

if __name__ == "__main__":
    data = json.load(open(f"{ROOT}/app/data/characters.json", encoding="utf-8"))
    chars = data["characters"]
    import os
    os.makedirs(f"{ROOT}/public/cards", exist_ok=True)
    targets = sys.argv[1:]  # 특정 index만 (없으면 전체)
    for c in chars:
        idx = int(c["index"])
        if targets and str(idx) not in targets:
            continue
        make_card(idx, c["name"], c["tagline"], f"{ROOT}/public/cards/{idx:02d}.png")
