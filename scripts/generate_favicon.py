from pathlib import Path
from PIL import Image, ImageDraw

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 512
START_COLOR = (255, 122, 24)
END_COLOR = (255, 179, 71)

img = Image.new("RGBA", (SIZE, SIZE))
draw = ImageDraw.Draw(img)

for y in range(SIZE):
    ratio = y / (SIZE - 1)
    r = int(START_COLOR[0] * (1 - ratio) + END_COLOR[0] * ratio)
    g = int(START_COLOR[1] * (1 - ratio) + END_COLOR[1] * ratio)
    b = int(START_COLOR[2] * (1 - ratio) + END_COLOR[2] * ratio)
    draw.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))

PADDING = 48
inner_bounds = (PADDING, PADDING, SIZE - PADDING, SIZE - PADDING)
draw.rounded_rectangle(inner_bounds, radius=100, outline=(255, 255, 255, 90), width=6)

F_PATH = [
    (SIZE * 0.38, SIZE * 0.28),
    (SIZE * 0.6, SIZE * 0.28),
    (SIZE * 0.6, SIZE * 0.34),
    (SIZE * 0.46, SIZE * 0.34),
    (SIZE * 0.46, SIZE * 0.44),
    (SIZE * 0.58, SIZE * 0.44),
    (SIZE * 0.58, SIZE * 0.5),
    (SIZE * 0.46, SIZE * 0.5),
    (SIZE * 0.46, SIZE * 0.72),
    (SIZE * 0.38, SIZE * 0.72),
]
draw.polygon(F_PATH, fill=(255, 255, 255, 255))

png_path = OUTPUT_DIR / "favicon.png"
ico_path = OUTPUT_DIR / "favicon.ico"
img.save(png_path)
img.save(ico_path, format="ICO", sizes=[(32, 32), (48, 48), (64, 64)])

print(f"Saved favicon assets to {png_path} and {ico_path}")
