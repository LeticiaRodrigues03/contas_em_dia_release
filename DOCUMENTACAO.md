# Contas em Dia — Documentação do Projeto

> App de controle de contas a pagar com lembretes de vencimento, resumo mensal, categorias,
> backup e sincronização em nuvem. Disponível para Android, iOS e web.

---

## 1. Visão geral

| Item | Detalhe |
|---|---|
| Nome | Contas em Dia |
| Pacote Android / Bundle iOS | `com.emergent.vencimentos.kjfj0h` |
| Frontend | TypeScript · React Native 0.86 · Expo SDK 57 · Expo Router (rotas por arquivo) |
| Backend | Python 3.11 · FastAPI · Motor (MongoDB assíncrono) · JWT |
| Banco de dados | MongoDB |
| Idioma do app | Português (pt-BR) |
| Plataformas | Android, iOS, Web (GitHub Pages) |

### Funcionalidades
- **Autenticação** com e-mail e senha (JWT). Dados sincronizados por usuário.
- **Contas**: nome, valor, vencimento, categoria, observações, repetição mensal e status pago/pendente.
  Ao marcar uma conta recorrente como paga, a próxima parcela (mês seguinte) é criada automaticamente.
- **Tela inicial**: resumo do mês (a pagar / pago / atrasadas), contas atrasadas e próximos 5 dias.
- **Filtros**: por status (pendentes, atrasadas, pagas), categoria, mês e busca por texto.
- **Relatório mensal**: gráfico de gastos por categoria e cartão de resumo compartilhável (WhatsApp).
- **Lembretes locais**: notificações 5, 3 e 1 dia antes e no dia do vencimento (configurável).
- **Backup**: exportar/importar JSON com todas as contas.
- **Ajustes**: notificações, backup, política de privacidade, sair e excluir conta.

### Categorias disponíveis
`Moradia · Energia · Água · Internet · Telefone · Cartão · Transporte · Saúde · Educação · Lazer · Impostos · Outros`

---

## 2. Estrutura do repositório

```
app/
├── backend/                     # API FastAPI
│   ├── server.py                # App, CORS, /health, inclusão dos routers em /api
│   ├── db.py                    # Conexão MongoDB (Motor)
│   ├── auth_utils.py            # Hash de senha (bcrypt) e JWT
│   ├── models/
│   │   ├── user.py              # RegisterIn, LoginIn, UserOut, AuthOut
│   │   └── bill.py              # Bill, BillCreate, BillUpdate, Backup*, CATEGORIES
│   ├── routers/
│   │   ├── auth.py              # /api/auth/*
│   │   ├── bills.py             # /api/bills, /api/categories, /api/backup/*
│   │   └── legal.py             # /api/privacy (HTML)
│   ├── requirements.txt
│   └── .env                     # MONGO_URL, DB_NAME, JWT_SECRET, JWT_EXPIRE_MINUTES
│
├── frontend/                    # App Expo
│   ├── app/                     # Rotas (Expo Router)
│   │   ├── _layout.tsx          # Providers (auth, prefs, react-query), fontes, Stack
│   │   ├── index.tsx            # Redireciona para login ou abas
│   │   ├── login.tsx            # Entrar / Criar conta
│   │   ├── bill-form.tsx        # Criar/editar conta (modal)
│   │   ├── report.tsx           # Relatório mensal + compartilhar
│   │   ├── privacy.tsx          # Política de privacidade (in-app)
│   │   └── (tabs)/
│   │       ├── _layout.tsx      # Barra de abas: Início · Filtrar · Ajustes
│   │       ├── index.tsx        # Tela inicial
│   │       ├── filter.tsx       # Filtros e busca
│   │       └── settings.tsx     # Ajustes
│   ├── src/
│   │   ├── api.ts               # Cliente HTTP (fetch + token Bearer)
│   │   ├── auth.tsx             # Contexto de autenticação (SecureStore)
│   │   ├── bills.ts             # Regras de datas, status, agrupamento, resumo
│   │   ├── notifications.ts     # Agendamento de lembretes locais
│   │   ├── backup.ts            # Exportar/importar arquivo JSON
│   │   ├── prefs.tsx            # Preferências (lembretes) em AsyncStorage
│   │   ├── theme.ts             # Cores, tipografia, espaçamentos
│   │   ├── types.ts             # Tipos TS compartilhados + CATEGORIES
│   │   └── components/          # bill-row, summary-card, calendar-picker, ui
│   ├── assets/images/           # icon, adaptive-icon, splash, logo
│   ├── scripts/export-web.sh    # Build web para GitHub Pages
│   ├── app.json                 # Configuração Expo (nome, ícones, permissões, plugins)
│   └── .env                     # EXPO_PUBLIC_BACKEND_URL (+ variáveis do Emergent)
│
├── docs/                        # Build web publicado no GitHub Pages (+ privacy.html)
├── play_store_assets/           # Ícone, banner, capturas e vídeo para a Google Play
├── memory/PRD.md                # Histórico de requisitos e decisões
└── DOCUMENTACAO.md              # Este arquivo
```

---

## 3. Backend (API)

Base URL: `https://<host>/api`. Todas as rotas, exceto registro/login/privacidade/health, exigem o
header `Authorization: Bearer <token>`.

### 3.1 Autenticação — `/api/auth`
| Método | Rota | Descrição | Corpo |
|---|---|---|---|
| POST | `/register` | Cria usuário e devolve token | `{ name, email, password (≥ 6) }` |
| POST | `/login` | Autentica e devolve token | `{ email, password }` |
| GET | `/me` | Dados do usuário logado | — |
| DELETE | `/me` | Exclui a conta e **todas** as contas do usuário | — |

Resposta de registro/login: `{ access_token, token_type: "bearer", user: { id, name, email } }`.

### 3.2 Contas — `/api`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/categories` | Lista de categorias válidas |
| GET | `/bills` | Todas as contas do usuário |
| POST | `/bills` | Cria conta |
| GET | `/bills/{id}` | Detalhe |
| PUT | `/bills/{id}` | Atualiza (campos completos) |
| PATCH | `/bills/{id}/paid` | Marca/desmarca como paga. Se recorrente e paga, cria a próxima (`next_bill`) |
| DELETE | `/bills/{id}` | Remove |

**Modelo `Bill`**
```json
{
  "id": "uuid", "user_id": "uuid",
  "name": "Energia elétrica", "amount": 214.37, "due_date": "2026-06-20",
  "recurring": true, "category": "Energia", "notes": "",
  "paid": false, "paid_at": null,
  "created_at": "...", "updated_at": "..."
}
```
`amount = 0` significa "valor não informado". Categoria inválida é normalizada para `Outros`.

### 3.3 Backup — `/api/backup`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/export` | `{ app: "contas-em-dia", version: 1, exported_at, bills: [...] }` |
| POST | `/import` | `{ bills: [...], replace: false }` → `{ imported: n }`. `replace=true` apaga as contas atuais antes |

### 3.4 Outros
| Rota | Descrição |
|---|---|
| `GET /api/privacy` | Política de privacidade em HTML (link para as lojas) |
| `GET /health` | Readiness check (HTTP 200) |

### 3.5 Coleções MongoDB
- `users`: `{ id, name, email (único), password_hash, created_at }`
- `bills`: documentos no formato `Bill` acima (`due_date` salvo como string ISO)

### 3.6 Variáveis de ambiente (`backend/.env`)
| Variável | Uso |
|---|---|
| `MONGO_URL` | String de conexão do MongoDB |
| `DB_NAME` | Nome do banco |
| `JWT_SECRET` | Segredo para assinar tokens |
| `JWT_EXPIRE_MINUTES` | Validade do token |

---

## 4. Frontend (app)

### 4.1 Navegação
```
/                → redireciona (login ou abas)
/login           → Entrar / Criar conta
/(tabs)/index    → Início         ┐
/(tabs)/filter   → Filtrar        ├ barra de abas inferior
/(tabs)/settings → Ajustes        ┘
/bill-form       → Nova conta / Editar (modal, param ?id=)
/report          → Relatório mensal + compartilhar
/privacy         → Política de privacidade
```

### 4.2 Estado e dados
- **Autenticação** (`src/auth.tsx`): token salvo no `expo-secure-store` (chave `contas_em_dia_token`);
  na web usa fallback de armazenamento do navegador.
- **Dados remotos**: `@tanstack/react-query` com `src/api.ts` (fetch para `EXPO_PUBLIC_BACKEND_URL + /api`).
- **Preferências** (`src/prefs.tsx`): lembretes ativados e "avisar no dia", em AsyncStorage.

### 4.3 Lembretes (`src/notifications.ts`)
- Usa `expo-notifications` (notificações **locais**, sem servidor push).
- `syncReminders(bills, prefs)`: cancela tudo e reagenda, para cada conta pendente, avisos em
  D‑5, D‑3, D‑1 e (opcional) no dia do vencimento, às 9h.
- Permissão pedida de forma contextual; se negada, a UI oferece abrir os Ajustes do sistema.
- Não funciona na web nem completamente no Expo Go (Android) — exige build nativo.

### 4.4 Backup (`src/backup.ts`)
- Exportar: baixa `GET /backup/export`, grava um `.json` e abre a folha de compartilhamento (`expo-sharing`).
- Importar: `expo-document-picker` → valida `app === "contas-em-dia"` → `POST /backup/import`.

### 4.5 Compartilhar resumo (`app/report.tsx`)
- Dois modos: **"Compartilhar no WhatsApp"** envia o resumo em texto (abre o WhatsApp / `wa.me`) e
  **"Compartilhar como imagem"** captura o cartão do mês e abre a folha nativa (apenas celular).

### 4.6 Tema (`src/theme.ts`)
Identidade verde: primária `#059669`. Fontes **Outfit** (títulos) e **Manrope** (texto).
Todas as cores devem vir do tema (`colors` / `useTheme()`).

### 4.7 Permissões declaradas (`app.json`)
- Android: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`.
- iOS: descrição de uso de notificações.

---

## 5. Como rodar localmente

### Backend
```bash
cd backend
pip install -r requirements.txt
# configure backend/.env (MONGO_URL, DB_NAME, JWT_SECRET, JWT_EXPIRE_MINUTES)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
yarn install
# frontend/.env → EXPO_PUBLIC_BACKEND_URL=https://<host-do-backend>
yarn expo start        # abre no Expo Go (QR code) ou no navegador (w)
```

Scripts úteis:
- `yarn lint` — ESLint.
- `./scripts/export-web.sh [/base-path]` — gera o build web em `/docs` para o GitHub Pages
  (base padrão `/contas_em_dia_release`).

---

## 6. Publicação

| Destino | Como |
|---|---|
| Backend + builds nativos | Botão **Publish** no Emergent → gera deploy e builds Android (.apk/.aab) e iOS |
| Web | `frontend/scripts/export-web.sh` → commit da pasta `docs/` → GitHub Pages (branch `main`, pasta `/docs`) |
| Política de privacidade | `https://leticiarodrigues03.github.io/contas_em_dia_release/privacy.html` (ou `/api/privacy` no backend) |
| Recursos da Google Play | Pasta `play_store_assets/` (ver `play_store_assets/README.md`) |

---

## 7. Contas de teste
Ver `memory/test_credentials.md`. Conta demo com dados fictícios: `demo@contasemdia.app` / `Demo12345`.

## 8. Regras de negócio resumidas
- **Status** de uma conta: `paga` · `atrasada` (vencimento < hoje e não paga) · `hoje` · `pendente`.
- **Recorrência**: pagar uma conta recorrente gera a próxima no mesmo dia do mês seguinte
  (ajustado ao último dia do mês quando necessário).
- **Resumo mensal**: soma de pendentes e pagas das contas cujo vencimento cai no mês selecionado.
- **Exclusão de conta de usuário** remove todos os dados do usuário (LGPD).

## 9. Contato
Suporte / privacidade: leticiarodrigues173@gmail.com
