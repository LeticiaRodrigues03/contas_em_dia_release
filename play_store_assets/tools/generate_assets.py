#!/usr/bin/env python3
"""Gera os recursos visuais da Google Play a partir do ícone do projeto e das
capturas reais do app (tiradas em /tmp/raw via Playwright a 1080px de largura).

Uso: python3 play_store_assets/tools/generate_assets.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "play_store_assets"
RAW = Path("/tmp/raw")
FONTS = ROOT / "frontend/node_modules/@expo-google-fonts"
OUTFIT = FONTS / "outfit/700Bold/Outfit_700Bold.ttf"
MANROPE = FONTS / "manrope/500Medium/Manrope_500Medium.ttf"
MANROPE_B = FONTS / "manrope/700Bold/Manrope_700Bold.ttf"
SYMBOL = ROOT / "frontend/assets/images/adaptive-icon.png"

GREEN, GREEN_DARK, GREEN_DEEP = (5, 150, 105), (4, 120, 87), (6, 78, 59)
WHITE, INK = (255, 255, 255), (11, 31, 23)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def gradient(w: int, h: int, c1, c2, diagonal=True) -> Image.Image:
    base = Image.new("RGB", (w, h), c1)
    px = base.load()
    for y in range(h):
        for x in range(w):
            t = ((x / w) + (y / h)) / 2 if diagonal else y / h
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return base


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def shadow(size, radius, blur=40, alpha=110) -> Image.Image:
    pad = blur * 2
    layer = Image.new("RGBA", (size[0] + pad * 2, size[1] + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle([pad, pad, pad + size[0], pad + size[1]], radius, fill=(0, 0, 0, alpha))
    return layer.filter(ImageFilter.GaussianBlur(blur)), pad


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= max_w:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def symbol_image(size: int) -> Image.Image:
    sym = Image.open(SYMBOL).convert("RGBA")
    sym = sym.crop(sym.getbbox())
    sym.thumbnail((size, size), Image.LANCZOS)
    return sym


# ---------- 1. Ícone 512x512 (fundo verde, símbolo em alto contraste) ----------
def make_icon(size: int, path: Path):
    bg = gradient(size, size, (16, 185, 129), GREEN_DEEP)
    draw = ImageDraw.Draw(bg, "RGBA")
    draw.ellipse([-size * 0.25, size * 0.55, size * 0.55, size * 1.35], fill=(255, 255, 255, 18))
    draw.ellipse([size * 0.55, -size * 0.3, size * 1.3, size * 0.45], fill=(255, 255, 255, 14))
    sym = symbol_image(int(size * 0.74))
    sh, pad = shadow(sym.size, int(size * 0.2), blur=int(size * 0.05), alpha=90)
    x, y = (size - sym.width) // 2, (size - sym.height) // 2 + int(size * 0.02)
    bg.paste(sh, (x - pad, y - pad + int(size * 0.03)), sh)
    bg.paste(sym, (x, y), sym)
    bg.save(path, "PNG", optimize=True)


# ---------- 2. Recurso gráfico 1024x500 ----------
def phone_mock(shot: Image.Image, width: int, radius: int, bezel: int) -> Image.Image:
    scale = width / shot.width
    screen = shot.resize((width, int(shot.height * scale)), Image.LANCZOS)
    screen = rounded(screen, radius - bezel)
    body = Image.new("RGBA", (width + bezel * 2, screen.height + bezel * 2), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle([0, 0, body.width - 1, body.height - 1], radius, fill=INK)
    body.paste(screen, (bezel, bezel), screen)
    return body


def make_feature_graphic(path: Path):
    W, H = 1024, 500
    bg = gradient(W, H, GREEN_DEEP, GREEN)
    draw = ImageDraw.Draw(bg, "RGBA")
    draw.ellipse([560, -260, 1180, 360], fill=(255, 255, 255, 12))
    draw.ellipse([-180, 300, 300, 780], fill=(255, 255, 255, 10))

    icon = Image.open(OUT / "icon/app_icon_512.png").resize((104, 104), Image.LANCZOS)
    icon = rounded(icon, 24)
    sh, pad = shadow(icon.size, 24, blur=14, alpha=120)
    bg.paste(sh, (64 - pad, 64 - pad + 6), sh)
    bg.paste(icon, (64, 64), icon)

    draw.text((188, 70), "Contas em Dia", font=font(OUTFIT, 58), fill=WHITE)
    draw.text((190, 138), "Lembretes de vencimento e controle de contas", font=font(MANROPE, 21), fill=(209, 250, 229))

    tag_font = font(OUTFIT, 40)
    y = 212
    for line in wrap(draw, "Suas contas organizadas, seus dias mais tranquilos.", tag_font, 560):
        draw.text((64, y), line, font=tag_font, fill=WHITE)
        y += 50

    chip_font = font(MANROPE_B, 19)
    x = 64
    for label in ["Lembretes de vencimento", "Resumo mensal", "Categorias"]:
        tw = draw.textlength(label, font=chip_font)
        draw.rounded_rectangle([x, 372, x + tw + 36, 372 + 46], 23, fill=(255, 255, 255, 34), outline=(255, 255, 255, 90))
        draw.text((x + 18, 383), label, font=chip_font, fill=WHITE)
        x += tw + 36 + 12

    phone = phone_mock(Image.open(RAW / "home.png"), 262, 44, 10)
    sh, pad = shadow(phone.size, 44, blur=30, alpha=130)
    px, py = 704, 56
    bg.paste(sh, (px - pad, py - pad + 20), sh)
    bg.paste(phone, (px, py), phone)
    bg.save(path, "PNG", optimize=True)


# ---------- 3. Capturas de tela 1080x1920 com título ----------
SCREENS = [
    ("01_inicio", "home", "Veja tudo o que vence este mês", "Quanto falta pagar, o que já foi pago e o que está atrasado"),
    ("02_cadastro", "form", "Cadastre uma conta em segundos", "Valor, vencimento, categoria e repetição mensal"),
    ("03_filtros", "filter", "Filtre por status, categoria ou mês", "Pendentes, atrasadas e pagas sempre à mão"),
    ("04_lembretes", "settings", "Lembretes antes do vencimento", "5, 3 e 1 dia antes — e no próprio dia"),
    ("05_relatorio", "report", "Gastos por categoria", "Entenda para onde vai o seu dinheiro"),
    ("06_compartilhar", "share", "Compartilhe o resumo do mês", "Envie para o WhatsApp em um toque", "bottom"),
]


def make_screenshot(name: str, raw: str, title: str, subtitle: str, anchor: str = "top"):
    """anchor="top": título em cima e celular sangrando embaixo; "bottom": o inverso
    (usado quando a parte relevante da tela está no fim da rolagem)."""
    W, H = 1080, 1920
    bg = gradient(W, H, GREEN_DEEP, GREEN, diagonal=False)
    draw = ImageDraw.Draw(bg, "RGBA")
    draw.ellipse([620, -300, 1300, 380], fill=(255, 255, 255, 10))

    t_font, s_font = font(OUTFIT, 68), font(MANROPE, 36)
    phone = phone_mock(Image.open(RAW / f"{raw}.png"), 840, 72, 14)
    if anchor == "bottom":
        px, py = (W - phone.width) // 2, H - 420 - phone.height
        sh, pad = shadow(phone.size, 72, blur=50, alpha=140)
        bg.paste(sh, (px - pad, py - pad + 30), sh)
        bg.paste(phone, (px, py), phone)
        draw.rectangle([0, H - 1, W, H], fill=GREEN)
        y = H - 330
        for line in wrap(draw, title, t_font, 940):
            tw = draw.textlength(line, font=t_font)
            draw.text(((W - tw) / 2, y), line, font=t_font, fill=WHITE)
            y += 82
        y += 10
        for line in wrap(draw, subtitle, s_font, 900):
            tw = draw.textlength(line, font=s_font)
            draw.text(((W - tw) / 2, y), line, font=s_font, fill=(209, 250, 229))
            y += 48
        bg.save(OUT / "screenshots" / f"{name}.png", "PNG", optimize=True)
        return
    y = 120
    for line in wrap(draw, title, t_font, 940):
        tw = draw.textlength(line, font=t_font)
        draw.text(((W - tw) / 2, y), line, font=t_font, fill=WHITE)
        y += 82
    y += 10
    for line in wrap(draw, subtitle, s_font, 900):
        tw = draw.textlength(line, font=s_font)
        draw.text(((W - tw) / 2, y), line, font=s_font, fill=(209, 250, 229))
        y += 48

    sh, pad = shadow(phone.size, 72, blur=50, alpha=140)
    px, py = (W - phone.width) // 2, max(y + 60, 470)
    bg.paste(sh, (px - pad, py - pad + 30), sh)
    bg.paste(phone, (px, py), phone)
    bg.save(OUT / "screenshots" / f"{name}.png", "PNG", optimize=True)


if __name__ == "__main__":
    for d in ["icon", "feature_graphic", "screenshots/raw", "video"]:
        (OUT / d).mkdir(parents=True, exist_ok=True)
    make_icon(512, OUT / "icon/app_icon_512.png")
    make_icon(1024, OUT / "icon/app_icon_1024.png")
    make_feature_graphic(OUT / "feature_graphic/feature_graphic_1024x500.png")
    for name, raw, title, sub, *anchor in SCREENS:
        make_screenshot(name, raw, title, sub, *anchor)
        Image.open(RAW / f"{raw}.png").save(OUT / "screenshots/raw" / f"{name}_raw.png", "PNG", optimize=True)
    print("ok")
