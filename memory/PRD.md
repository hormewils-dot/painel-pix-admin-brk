# PRD — Donas / BRK Painel Administrativo

## Problema original (pt-BR)
Painel administrativo **privado** (rota `/donaspainel`, login e senha) que registra e exibe as faturas geradas no site público (o site público será construído depois). Requisitos:
1. Campo para adicionar **chave PIX** em Configurações.
2. Campo para configurar **notificações no grupo do bot Telegram** em Configurações.
3. **Dashboard**: faturas geradas, acessos ao site público, atividade em tempo real (acesso, PIX gerado, PIX copiado).
4. **Aba de faturas geradas**.
5. Rota `/donaspainel` com login (user: `donas`).
Exigência de visual altamente profissional.

## Stack
- Frontend: React 19 + Tailwind + shadcn/ui + recharts + sonner. Rota base `/donaspainel`.
- Backend: FastAPI + MongoDB (motor). Prefixo `/api`.
- Auth: JWT custom (bcrypt), token no header `Authorization: Bearer`, armazenado em localStorage (`brk_token`).

## Implementado (17/11/2026)
- **Auth**: login `/api/auth/login`, `/api/auth/me`, admin seedado do `.env` (user `donas`, email owner `hormewils@gmail.com`). Rotas de dados protegidas (401 sem token). ✅ testado
- **Dashboard** (`/api/dashboard/overview`): 6 KPIs (pagamentos gerados, QR copiados, total pagamentos R$, PIX copiados R$, clicks home, clicks faturas), gráfico 7 dias, recentes, feed ao vivo (poll 2s). ✅
- **Faturas** (`/api/faturas`): tabela com busca por documento, filtro por status (pago/pendente/expirado), modal de detalhe com QR + PIX copia-e-cola, botão copiar PIX com toast. ✅ testado
- **Atividade em tempo real** (`/api/activities`): feed estilo terminal, poll 2s. ✅
- **Configurações** (`GET/PUT /api/settings`): chave PIX (tipo, chave, beneficiário, cidade) + Telegram (token, chat id, switches de eventos) + botão de teste (`POST /api/settings/telegram/test`). ✅ testado (persistência + erro gracioso sem token Telegram)
- **Simulador**: loop no backend gera faturas/atividades/cliques continuamente (substitui o site público enquanto ele não existe). MOCKED até o site público ser construído.

## Pendente / Backlog
- **P0**: Construir o **site público** que realmente gera as faturas e dispara os eventos/notificações reais (substituir o simulador).
- **P1**: Notificações reais do Telegram disparadas nos eventos (hoje só há o botão de teste); exige token+chat id reais do usuário.
- **P1**: Geração real de PIX copia-e-cola (BR Code EMV válido) + QR real a partir da chave PIX configurada.
- **P2**: Exportar relatório CSV; paginação na tabela de faturas; marcar fatura como paga manualmente.

## Credenciais
Ver `/app/memory/test_credentials.md`.
