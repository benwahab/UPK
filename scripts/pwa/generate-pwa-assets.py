"""Génère les icônes PWA, les écrans de lancement iOS et l'image de partage à partir du logo UPK.

Usage : python3 scripts/pwa/generate-pwa-assets.py
Dépendance : Pillow. Fond blanc, logo centré horizontalement et verticalement.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps" / "web" / "public"
SOURCE = Path(__file__).resolve().parent / "upk-logo-source.png"
WHITE = (255, 255, 255, 255)

# Largeur du logo en part de la largeur de l'icône. Le maskable garde une marge de sécurité
# plus large car Android peut rogner jusqu'à 20 % sur chaque bord.
LOGO_SHARE_ANY = 0.72
LOGO_SHARE_MASKABLE = 0.58

# (largeur, hauteur en pixels, largeur CSS, hauteur CSS, ratio) des iPhone en portrait.
IPHONE_SPLASH = [
    (1320, 2868, 440, 956, 3),
    (1206, 2622, 402, 874, 3),
    (1290, 2796, 430, 932, 3),
    (1179, 2556, 393, 852, 3),
    (1284, 2778, 428, 926, 3),
    (1170, 2532, 390, 844, 3),
    (1125, 2436, 375, 812, 3),
    (1242, 2688, 414, 896, 3),
    (828, 1792, 414, 896, 2),
    (1242, 2208, 414, 736, 3),
    (750, 1334, 375, 667, 2),
    (640, 1136, 320, 568, 2),
]


def canvas(width: int, height: int, logo_share: float, by_width: bool = False) -> Image.Image:
    logo = Image.open(SOURCE).convert("RGBA")
    reference = width if by_width else min(width, height)
    target_width = round(reference * logo_share)
    target_height = round(logo.height * target_width / logo.width)
    logo = logo.resize((target_width, target_height), Image.LANCZOS)
    image = Image.new("RGBA", (width, height), WHITE)
    image.alpha_composite(logo, ((width - target_width) // 2, (height - target_height) // 2))
    return image.convert("RGB")


def save(image: Image.Image, path: Path) -> None:
    image.save(path, optimize=True)
    print(path.relative_to(ROOT), image.size)


def main() -> None:
    save(canvas(192, 192, LOGO_SHARE_ANY), PUBLIC / "icon-192.png")
    save(canvas(512, 512, LOGO_SHARE_ANY), PUBLIC / "icon-512.png")
    save(canvas(192, 192, LOGO_SHARE_MASKABLE), PUBLIC / "icon-maskable-192.png")
    save(canvas(512, 512, LOGO_SHARE_MASKABLE), PUBLIC / "icon-maskable-512.png")
    save(canvas(180, 180, LOGO_SHARE_ANY), PUBLIC / "apple-touch-icon.png")
    # Image d'aperçu pour le partage (Open Graph) : logo centré sur fond blanc.
    save(canvas(1200, 630, 0.42, by_width=True), PUBLIC / "og-default.png")
    splash = PUBLIC / "splash"
    splash.mkdir(exist_ok=True)
    for width, height, *_ in IPHONE_SPLASH:
        # Sur un écran de lancement, le logo occupe environ la moitié de la largeur.
        image = canvas(width, height, 0.5)
        save(image, splash / f"splash-{width}x{height}.png")


if __name__ == "__main__":
    main()
