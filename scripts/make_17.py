"""
characters_17(프로필) / characters_17_detail(디테일)을
characters_01 / characters_01_detail 포맷에 맞춰 편집.

프로필: 189x190, 모서리 radius 7, 단색 배경 + 캐릭터 중심
디테일: 337x225, 모서리 radius 11, 캐릭터 중심 크롭
"""
from PIL import Image, ImageDraw

def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=radius, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out

# ---------- 프로필 ----------
def make_profile(src_path, out_path, bg, size=(189, 190), radius=7,
                 width_frac=0.90, top_frac=0.07):
    src = Image.open(src_path).convert("RGBA")
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)
    W, H = size
    target_w = int(W * width_frac)
    scale = target_w / src.width
    src = src.resize((target_w, max(1, int(src.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", size, bg + (255,))
    x = (W - src.width) // 2
    y = int(H * top_frac)
    canvas.alpha_composite(src, (x, y))
    canvas = rounded(canvas, radius)
    canvas.save(out_path)
    print(f"프로필 저장: {out_path} ({W}x{H}, radius={radius}, bg={bg})")

# ---------- 디테일 (캐릭터 중심 크롭 → 리사이즈 → 라운드) ----------
def make_detail(src_path, out_path, size=(337, 225), radius=11,
                crop_box=None):
    src = Image.open(src_path).convert("RGBA")
    sw, sh = src.size
    tw, th = size
    target_ratio = tw / th
    if crop_box is None:
        # 전체에서 타깃 비율로 중앙 크롭
        if sw / sh > target_ratio:
            cw = int(sh * target_ratio); cw = min(cw, sw)
            x0 = (sw - cw) // 2; crop = (x0, 0, x0 + cw, sh)
        else:
            ch = int(sw / target_ratio); ch = min(ch, sh)
            y0 = (sh - ch) // 2; crop = (0, y0, sw, y0 + ch)
    else:
        crop = crop_box
    src = src.crop(crop)
    src = src.resize(size, Image.LANCZOS).convert("RGBA")
    src = rounded(src, radius)
    src.save(out_path)
    print(f"디테일 저장: {out_path} ({tw}x{th}, radius={radius}, crop={crop})")

if __name__ == "__main__":
    # 프로필: 빨간 공룡 → 민트 배경
    make_profile(
        "resources/characters_17.png",
        "resources/cocobi/characters_17.png",
        bg=(95, 199, 176),
    )
    # 디테일: 3마리 캐릭터가 있는 좌측-중앙 영역 중심 크롭 (aspect 337:225=1.498)
    make_detail(
        "resources/characters_17_detail.png",
        "resources/cocobi/characters_17_detail.png",
        crop_box=(0, 330, 1423, 1280),  # 2024x1304 원본에서
    )
