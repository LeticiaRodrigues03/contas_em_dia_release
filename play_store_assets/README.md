# Recursos visuais — Google Play — Contas em Dia

Todos os materiais foram gerados a partir do **app real em execução** (Expo/React Native — o projeto
foi migrado de Flutter para Expo nesta plataforma) usando a conta demo `demo@contasemdia.app`
com dados **fictícios**. Nenhuma regra de negócio, banco, autenticação ou configuração do app foi alterada.

## Estrutura
```
play_store_assets/
├── icon/
│   ├── app_icon_512.png          ← upload Play Console (512×512, PNG, 201 KB)
│   └── app_icon_1024.png         ← versão para usar dentro do app (ver abaixo)
├── feature_graphic/
│   └── feature_graphic_1024x500.png   ← upload Play Console (1024×500, PNG, 133 KB)
├── screenshots/
│   ├── 01_inicio.png             ← 1080×1920 (9:16) com título promocional
│   ├── 02_cadastro.png
│   ├── 03_filtros.png
│   ├── 04_lembretes.png
│   ├── 05_relatorio.png
│   ├── 06_compartilhar.png
│   └── raw/*.png                 ← capturas puras 1080×2337 (sem moldura; apenas referência, NÃO são 9:16)
├── tablet_avaliacao/             ← capturas em 7" e 10" apenas para avaliação interna (não enviar)
├── video/
│   ├── contas_em_dia_promo_1080x1920.mp4   ← vídeo real do app (47 s) para subir no YouTube
│   ├── roteiro.md                           ← cenas, instruções de publicação
│   └── cartao_*.png                         ← cartões de abertura/encerramento
└── tools/generate_assets.py      ← script que regenera ícone, banner e capturas
```

## Status
| Material | Status |
|---|---|
| Ícone 512×512 | ✅ Pronto para upload |
| Recurso gráfico 1024×500 | ✅ Pronto para upload |
| Capturas de telefone (6) | ✅ Prontas para upload (≥ 1080×1920, PNG, < 1 MB cada) |
| Vídeo promocional | ⚠️ Arquivo pronto; **depende de upload manual no YouTube** |
| Capturas de tablet | ⏸️ Não enviadas (ver "Tablet") |

## Como preencher no Play Console
Caminho: **Aumentar o número de usuários → Presença na loja → Página principal da loja**
(ou *Store presence → Main store listing*).

| Campo | Arquivo |
|---|---|
| Ícone do app | `icon/app_icon_512.png` |
| Recurso gráfico | `feature_graphic/feature_graphic_1024x500.png` |
| Vídeo | URL do YouTube após enviar `video/contas_em_dia_promo_1080x1920.mp4` (opcional) |
| Capturas de tela do telefone | `screenshots/01_inicio.png` … `06_compartilhar.png`, nesta ordem |
| Tablet de 7" / 10" | deixar em branco por enquanto |

Textos sugeridos (coerentes com as imagens):
- **Nome do app**: Contas em Dia
- **Descrição breve** (≤ 80): Lembretes de vencimento, resumo mensal e categorias para suas contas.

## Usar o novo ícone dentro do app (opcional)
O ícone atual do app (`frontend/assets/images/icon.png`) tem fundo branco. Para usar o mesmo ícone
verde da loja dentro do app, basta copiar (sem alterar nenhuma configuração):
```
cp play_store_assets/icon/app_icon_1024.png frontend/assets/images/icon.png
```
O ícone adaptativo do Android (`adaptive-icon.png`, símbolo com fundo transparente) continua válido;
se quiser o fundo verde também nele, altere `android.adaptiveIcon.backgroundColor` para `#059669` no `app.json`.

## Tablet
A interface **funciona** em 7" e 10" (nada quebra), mas não é otimizada: o conteúdo se estica
em largura total, as abas inferiores ficam muito espaçadas e a lista fica com muito espaço em branco
(ver `tablet_avaliacao/`). A Google Play **permite publicar sem capturas de tablet** — elas só são
exigidas se o app for promovido para tablets/Chromebooks. Recomendação: deixar para uma etapa
posterior, após ajustar o layout (largura máxima centralizada ~600 px).

## Regenerar os materiais
1. Capture as telas reais em 1080 px de largura para `/tmp/raw/` (home, form, filter, settings, report, share).
2. `python3 play_store_assets/tools/generate_assets.py`
