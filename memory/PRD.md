# Contas em Dia — PRD

## Problema original
Usuário enviou o `main.dart` (Flutter) do app "Contas em Dia" — gerenciador/lembrete de contas — e pediu para finalizá-lo como app completo e pronto para lojas, sem alterar a identidade da marca (verde, "Suas contas, no dia certo"). Stack do ambiente: Expo/React Native + FastAPI + MongoDB (usuário aprovou recriar em Expo).

## Escolhas do usuário
- Manter identidade e regras do main.dart
- Dados no servidor com login (sincroniza entre aparelhos) → JWT e-mail/senha
- Extras: categorias, resumo mensal, backup exportar/importar
- Notificações locais X dias antes (5/3/1) + no dia
- Logo: usuário vai enviar (placeholder: carteira verde)

## Personas
Pessoa física que quer não esquecer vencimentos (luz, aluguel, cartão) e ver quanto falta pagar no mês.

## Implementado (2026-10-08)
- Auth JWT (Argon2), registro/login/me/excluir conta (LGPD)
- CRUD de contas por usuário; marcar paga; recorrência mensal gera próximo mês (mesma regra do main.dart, dia ajustado ao fim do mês, sem duplicar)
- Home: resumo mensal (a pagar/pago/atrasadas, navegação de meses), seções Atrasadas (vermelho), Próximos 5 dias (laranja), Futuras (azul), Pagas (verde, 3 últimas + "Ver todas")
- Filtrar: busca por nome, status, categoria, mês
- Ajustes: notificações on/off, dias antes 5/3/1, lembrete no dia, testar notificação, tema Sistema/Claro/Escuro, exportar/importar backup JSON, política de privacidade, sair, excluir conta
- Notificações locais (expo-notifications) ressincronizadas a cada mudança (máx. 60 agendadas, 9h)
- app.json: nome, slug, scheme, permissões Android, plugin notifications

## Implementado (2026-10-08, iteração 2)
- Logo oficial: ícone do app, adaptive icon, splash, favicon e cabeçalho/login
- Tela /report: gráfico de gastos por categoria (barra empilhada + barras por categoria com %), cartão de resumo mensal, compartilhar no WhatsApp (wa.me texto) e como imagem (nativo, view-shot)
- Acesso discreto pelo botão no cartão de resumo da Home

## Implementado (iteração 3)
- Health check de deploy: sem bloqueios (status WARN só por metadados de loja)
- Política de privacidade pública em GET /api/privacy (HTML) para usar como URL nas lojas

## Implementado (iteração 4)
- Health check de deploy: PASS (adicionado GET /health no nível raiz; METRO_CACHE_ROOT entre aspas no frontend/.env)

## Backlog
- P1: recuperação de senha por e-mail (Resend), login com Google
- P1: gráficos por categoria/mês
- P2: anexar comprovante (object storage), widget, compartilhar conta

## Política de privacidade (jun/2026)
- Arquivo estático para GitHub Pages: `/app/docs/privacy.html` (URL final: https://<usuario>.github.io/<repo>/privacy.html)
- Contato incluído na política (backend `/api/privacy`, tela `/privacy` e docs): leticiarodrigues173@gmail.com

## Versão web (GitHub Pages) — jun/2026
- Script: `frontend/scripts/export-web.sh [base-path]` → gera build Expo web em `/docs` (preserva privacy.html, cria .nojekyll e 404.html)
- Base path: `/contas_em_dia_release` → https://leticiarodrigues03.github.io/contas_em_dia_release/
- Backend usado pelo build web: EXPO_PUBLIC_BACKEND_URL do frontend/.env (preview). Rebuildar se o backend mudar.

## Recursos visuais Google Play — jun/2026
- Pasta `/app/play_store_assets/` (README.md com instruções de upload): ícone 512, feature graphic 1024x500, 6 capturas 1080x1920 (reais, conta demo demo@contasemdia.app), vídeo mp4 47s (precisa upload manual no YouTube), avaliação tablet.
- Gerador: `play_store_assets/tools/generate_assets.py` (PIL) a partir de capturas Playwright em /tmp/raw.
- Nenhuma alteração em código de produção.

## Upgrade v1.1.0 — jun/2026 (AdMob, Conta Familiar, categorias, notificações, build)
- AdMob: react-native-google-mobile-ads + UMP; banner adaptativo no rodapé de Início e Filtrar; App IDs em app.json, unit IDs em src/ads-config.ts (env EXPO_PUBLIC_ADMOB_*); só funciona em build nativo.
- Conta Familiar (novo): backend routers/family.py + sharing.py (scope_ids); grupo com código de 6 chars; contas e categorias compartilhadas entre membros; UI: card Home, /family, seção Ajustes, selo do dono nas linhas.
- Categorias personalizadas: routers/categories.py; CategoryPicker no formulário; filtro usa lista dinâmica; /categories (renomear/excluir → contas vão p/ "Outros").
- Removido "Testar notificação"; intro de permissão /notifications-intro no 1º acesso (prefs.notificationPromptDone); Ajustes mostra "Permissão negada → abrir ajustes".
- app.json: version 1.1.0, versionCode 2, buildNumber 2, expo-build-properties (ProGuard/R8 + shrinkResources). Pacote mantido (com.emergent.vencimentos.kjfj0h) por decisão do usuário (listagem já existe na Play).
- Política de privacidade atualizada (Conta Familiar + Anúncios) em legal.py, privacy.tsx e docs/privacy.html.
- Testes: iteration_3 (backend 100%, frontend OK); builds .aab/.ipa só via Publish do Emergent (sem SDK local).
