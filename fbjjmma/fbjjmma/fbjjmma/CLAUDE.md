@AGENTS.md

# Sistema FBJJMMA — Guia para o Claude

## Visão Geral

Sistema de gerenciamento de torneios de Jiu-Jitsu e MMA da Federação Baiana de Jiu Jitsu e MMA (FBJJMMA). Controla eventos, inscrições, chaves de competição, tatames e premiação.

## Stack

- **Framework:** Next.js 16.2.1 com App Router e Turbopack
- **Linguagem:** TypeScript estrito
- **ORM:** Prisma 7 com PostgreSQL (adapter `@prisma/adapter-pg`)
- **Autenticação:** NextAuth v5 (beta)
- **UI:** Tailwind CSS v4 + Radix UI + Lucide React
- **Formulários:** React Hook Form + Zod
- **Tempo real:** Server-Sent Events (SSE) com pub/sub in-memory

## Comandos

```bash
npm run dev      # inicia o servidor de desenvolvimento
npm run build    # gera o build de produção
npm run start    # inicia em modo produção
npm run lint     # executa o ESLint
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── (admin)/admin/          # Painel administrativo (eventos, atletas, equipes, usuários, tabelas de peso)
│   ├── (auth)/                 # Login e cadastro
│   ├── (coordenador)/
│   │   ├── coordenador/[tatameId]/   # Tela do coordenador de tatame (controle de chaves ao vivo)
│   │   └── premiacao/[eventId]/      # Tela do coordenador de premiação
│   ├── (public)/               # Área pública (eventos, inscrições, minha conta)
│   └── api/
│       ├── admin/              # Rotas de admin (eventos, chaves, atletas, tatames, etc.)
│       ├── coordenador/        # Rotas do coordenador (iniciar chave, registrar resultado, SSE stream)
│       ├── premiacao/          # Rotas de premiação (listar e marcar como premiado)
│       └── public/             # Rotas públicas (eventos, inscrições, atleta)
├── components/
│   ├── admin/
│   │   ├── BracketView.tsx           # Visualização gráfica da chave (SVG + divs absolutos)
│   │   ├── EventoForm.tsx
│   │   ├── GerenciarAtletaModal.tsx
│   │   └── InscricaoAdminModal.tsx
│   └── ui/                     # Componentes Radix/shadcn
├── lib/
│   ├── auth.ts                 # Configuração do NextAuth
│   ├── db.ts                   # Cliente Prisma singleton
│   ├── bracket-utils.ts        # Utilitários de chave (ex: resetBracketAwards)
│   ├── tatame-events.ts        # Pub/sub SSE in-memory para atualizações em tempo real
│   └── utils.ts
└── types/
```

## Modelos Prisma Principais

| Modelo | Descrição |
|---|---|
| `User` | Usuário do sistema (atleta, coordenador, admin) |
| `Athlete` | Perfil do atleta vinculado ao User |
| `Team` | Equipe/academia |
| `Event` | Evento/torneio |
| `Registration` | Inscrição de um atleta em um evento |
| `WeightTable` / `WeightCategory` | Tabelas e categorias de peso |
| `Tatame` | Tatame de um evento, com PIN de acesso |
| `Bracket` | Chave de competição (grupo de atletas numa categoria) |
| `BracketPosition` | Posição de um atleta dentro de uma chave |
| `Match` | Partida entre dois atletas dentro de uma chave |

## Regras de Negócio Importantes

### Algoritmo de Seeding das Chaves
- Chaves padrão usam seeding espelhado: seed `i` enfrenta seed `i + metade`
- Sementes ímpares (esquerda) vêm antes das pares (direita)
- Exemplo com 6 atletas, tamanho 8: (1v5), (3vBYE), (2v6), (4vBYE)

### Chave de 3 Atletas — Regra FBJJMMA 2.3
- **Round 1:** Atleta 1 vs Atleta 3. Atleta 2 aguarda.
- **Round 2 (repescagem):** Perdedor do Round 1 vs Atleta 2.
- **Round 3 (final):** Vencedor do Round 1 vs Vencedor do Round 2.
- O perdedor do Round 1 **não é eliminado** — recebe segunda chance.
- O perdedor do Round 2 é o **3° lugar**.
- Para encontrar o 3° lugar: é simplesmente quem não é nem 1° nem 2°.

### Status das Chaves
`PENDENTE` → `DESIGNADA` → `EM_ANDAMENTO` → `FINALIZADA` → `PREMIADA`

### Reset de Premiação
Ao finalizar uma chave (`FINALIZADA`), o campo `awarded` de todas as inscrições da chave é resetado para `false`. Isso garante que o coordenador de premiação sempre veja o estado limpo.

### SSE em Tempo Real
- `src/lib/tatame-events.ts`: singleton pub/sub por processo Node.js
- `notifyTatame(tatameId)` é chamado após qualquer alteração em chaves/partidas
- O coordenador de tatame escuta `/api/coordenador/tatame/[tatameId]/stream`
- Fallback: polling a cada 10 segundos

### W.O. Duplo (Ambos Ausentes)
- Quando ambos os atletas de uma partida estão ausentes, o coordenador pode registrar "W.O. — Ambos Ausentes"
- A partida fica com `winnerId: null`, `isWO: true`, `endedAt: preenchido`
- `isMatchResolved()` em `bracket-utils.ts` trata esse caso: `winnerId !== null || (isWO && endedAt !== null)`
- `propagateBracket()` ao encontrar um lado sem vencedor cria uma **partida solo pendente** para o atleta do outro lado (coordenador confirma presença ou aplica W.O.)
- No frontend, `currentMatches` filtra `!(m.isWO && m.endedAt)` para não exibir W.O. duplos já finalizados
- `isDone` no card de partida: `!!match.winnerId || (match.isWO && !!match.endedAt)`

### Chaves Grandes (> 16 atletas) — Grande Final
- Chaves com muitos atletas são divididas em sub-chaves via `bracketGroupId`
- Quando ambas as sub-chaves terminam (`status: FINALIZADA`), `checkAndCreateGrandFinal()` cria automaticamente uma nova chave (`isGrandFinal: true`) com os dois campeões
- A grande final começa com status `PENDENTE` e é iniciada manualmente pelo coordenador

### PIX do Campeão Absoluto
- Campo `prizePix String?` no modelo `Registration` (migration: `20260412120000_add_prize_pix_to_registration`)
- Na tela de premiação, ao premiar o 1° lugar de uma chave absoluta, abre modal para digitar a chave PIX
- O valor é salvo na inscrição e exibido no `BracketView` abaixo do nome do campeão

### Sessão do Coordenador de Tatame
- A criação de sessão usa `prisma.$transaction` para evitar sessões perdidas
- Liveness baseado em heartbeat: sessões sem heartbeat nos últimos 2 minutos são consideradas desconectadas
- Se o coordenador aparecer como desconectado, fechar e reabrir a página do tatame reconecta

### Reiniciar Chave (Admin)
- Endpoint `PATCH /api/admin/eventos/[id]/chaves/[bracketId]` reinicia a chave atomicamente:
  - Apaga todas as partidas (`Match`)
  - Reseta `isEliminated` nas posições
  - Reseta `awarded/medal` nas inscrições
  - Volta status para `PENDENTE` ou `DESIGNADA` (se tem tatame)

## Padrões de Código

- Todas as rotas de API verificam sessão com `auth()` antes de qualquer operação
- Parâmetros de rota em Next.js 16+ são `Promise` — sempre usar `await params`
- Não usar mocks; não criar arquivos desnecessários
- Preferir editar arquivos existentes a criar novos

## Idioma

Todo o código, comentários e comunicação com o usuário devem ser em **português**.
