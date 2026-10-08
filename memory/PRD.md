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

## Backlog
- P1: recuperação de senha por e-mail (Resend), login com Google
- P1: gráficos por categoria/mês
- P2: anexar comprovante (object storage), widget, compartilhar conta
