"""
전신 캐릭터 PNG(투명배경)를 characters_XX.png 형태의 정사각형 프로필로 변환.
- 형태: 레퍼런스(characters_03.png)의 비율 유지 (거의 정사각, 모서리 반경 ≈ 3%)
- 화질: 원본 캐릭터를 '리사이즈 없이(네이티브 해상도)' 사용해 최대한 선명하게.
  → 캔버스 크기를 캐릭터 크기에 맞춰 계산(업스케일로 인한 흐림 없음).
"""
from PIL import Image, ImageDraw

ASPECT = 190 / 189   # 레퍼런스 세로/가로 비
RADIUS_RATIO = 6 / 189  # 레퍼런스 모서리 반경 비율(≈0.0317)
WIDTH_FRAC = 0.86    # 캐릭터 폭 비율
TOP_FRAC = 0.10      # 머리 위 여백

def make(src_path, out_path, bg):
    src = Image.open(src_path).convert("RGBA")
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)               # 투명 여백 제거(리사이즈 아님)
    cw, ch = src.size                       # 캐릭터 네이티브 크기 그대로 사용

    out_w = round(cw / WIDTH_FRAC)          # 캐릭터가 폭의 86%가 되도록 캔버스 계산
    out_h = round(out_w * ASPECT)
    radius = max(1, round(out_w * RADIUS_RATIO))

    canvas = Image.new("RGBA", (out_w, out_h), bg + (255,))
    x = (out_w - cw) // 2
    y = round(out_h * TOP_FRAC)
    canvas.alpha_composite(src, (x, y))     # 원본 픽셀 그대로 합성(무손실)

    mask = Image.new("L", (out_w, out_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, out_w - 1, out_h - 1], radius=radius, fill=255)
    canvas.putalpha(mask)

    canvas.save(out_path)
    print(f"저장: {out_path}  ({out_w}x{out_h}, radius={radius}, bg={bg})")

if __name__ == "__main__":
    jobs = [
        ("resources/main_characters_coco_img.png", "resources/coco_profile.png", (108, 198, 232)),  # 하늘색
        ("resources/main_characters_lobi_img.png", "resources/lobi_profile.png", (180, 155, 227)),  # 라벤더
    ]
    for src, out, bg in jobs:
        make(src, out, bg)
