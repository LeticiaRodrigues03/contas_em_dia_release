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
