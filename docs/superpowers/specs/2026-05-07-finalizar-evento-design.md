# Design: Finalizar Evento

**Data:** 2026-05-07  
**Status:** Aprovado

## Visão Geral

Adicionar ao sistema um fluxo de finalização de evento que: impede operação acidental em eventos já encerrados, desconecta coordenadores ativos, corrige a lógica de acesso do coordenador ao tatame, e gera relatórios consolidados do evento.

## Abordagem

Reutilizar o status existente `ENCERRADO` do enum `EventStatus`. Sem mudanças de schema de banco de dados.

---

## 1. Botão "Finalizar Evento"

**Localização:** Topo da página de detalhes do evento no painel admin.  
**Visibilidade:** Somente quando `event.status === 'EM_ANDAMENTO'`.

**Ao clicar:**
1. Abre modal de confirmação que busca todas as chaves do evento
2. Lista as chaves que **não estão** com status `FINALIZADA` ou `PREMIADA`
3. Exibe aviso em destaque se houver chaves pendentes (ex: "3 chaves ainda não foram finalizadas")
4. Botões: "Confirmar e Encerrar" / "Cancelar" — pode confirmar mesmo com chaves pendentes

**Ao confirmar:**
1. `PATCH /api/admin/eventos/[id]` com `{ status: 'ENCERRADO' }`
2. Emite evento SSE `evento_encerrado` para todos os coordenadores ativos do evento via `notifyTatame`
3. Invalida/deleta as sessões de coordenador do evento no banco (`TatameSession` onde `tatame.eventId === id`)

---

## 2. Botão "Reabrir Evento"

**Localização:** Mesma posição do botão "Finalizar Evento".  
**Visibilidade:** Somente quando `event.status === 'ENCERRADO'`.  
**Ação:** `PATCH /api/admin/eventos/[id]` com `{ status: 'EM_ANDAMENTO' }`. Sem efeitos colaterais adicionais — coordenadores podem logar novamente normalmente.

---

## 3. Correção do Acesso do Coordenador

**Problema atual:** `POST /api/coordenador/entrar` busca o evento mais recente dos últimos 7 dias, independente do status — pode cair num evento já encerrado.

**Correção:** Adicionar filtro `status: { not: 'ENCERRADO' }` na query de seleção do evento dentro de `entrar`. Coordenador sempre cai no evento ativo.

**Comportamento na tela do coordenador ao receber `evento_encerrado` via SSE:**  
Exibir overlay/mensagem: "Este evento foi encerrado pelo administrador." com botão para voltar à tela de login.

---

## 4. Aba "Relatórios"

**Localização:** Nova aba no painel de detalhes do evento no admin.  
**Visibilidade:** Somente quando `event.status === 'ENCERRADO'`.

Contém três relatórios:

### 4.1 Resultados por Categoria
- **Formato:** Visualização web com `@media print` para impressão
- **Conteúdo:** Para cada chave finalizada/premiada: categoria (gênero, faixa, peso), 1° lugar, 2° lugar, 3° lugar (nome + equipe)
- **Rota:** `GET /api/admin/eventos/[id]/relatorios/resultados`

### 4.2 Informações dos Participantes
- **Formato:** Visualização web com `@media print`
- **Conteúdo:** Total de inscritos, breakdown por sexo, breakdown por faixa etária, breakdown por equipe (top N), breakdown por categoria de peso
- **Rota:** `GET /api/admin/eventos/[id]/relatorios/participantes`

### 4.3 Chaves em PDF
- **Formato:** PDF para download (único arquivo com todas as chaves)
- **Conteúdo:** Todas as chaves com status `FINALIZADA` ou `PREMIADA` — posições, resultados de cada partida, pódio
- **Rota:** `GET /api/admin/eventos/[id]/relatorios/chaves-pdf`
- **Implementação:** Geração server-side com biblioteca de PDF (ex: `@react-pdf/renderer` ou `puppeteer`)

---

## Fluxo Resumido

```
Admin clica "Finalizar Evento"
  → Modal mostra chaves pendentes
  → Admin confirma
    → event.status = ENCERRADO
    → SSE evento_encerrado → coordenadores desconectados
    → sessões de tatame invalidadas
    → aba "Relatórios" desbloqueada
```

```
Coordenador faz login
  → sistema filtra eventos com status != ENCERRADO
  → coordenador cai sempre no evento ativo
```
