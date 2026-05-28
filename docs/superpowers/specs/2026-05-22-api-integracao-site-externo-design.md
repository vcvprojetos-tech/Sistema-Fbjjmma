# API de Integração — Site Externo da Federação

**Data:** 2026-05-22
**Status:** Aprovado

## Contexto

O sistema FBJJMMA gera chaves, registra resultados e calcula rankings. O site externo da federação (onde os atletas se inscrevem) precisa exibir esses dados publicamente. A integração é feita via pull: o site externo consulta a API do FBJJMMA periodicamente.

## Endpoints

Todos os endpoints são públicos (sem autenticação), somente leitura, retornam JSON.
Base: `GET /api/public/eventos/[id]/`

---

### 1. `GET /api/public/eventos/[id]/chaves`

Retorna todas as chaves do evento com status `EM_ANDAMENTO`, `FINALIZADA` ou `PREMIADA`.

**Parâmetros opcionais:**
- `?faixa=AZUL` — filtra por faixa
- `?sexo=MASCULINO` — filtra por sexo
- `?absoluto=1` — retorna apenas chaves de absoluto

**Resposta:**
```json
[
  {
    "id": "...",
    "bracketNumber": 1,
    "status": "FINALIZADA",
    "belt": "AZUL",
    "isAbsolute": false,
    "weightCategory": {
      "name": "Até 64kg",
      "ageGroup": "ADULTO",
      "sex": "MASCULINO",
      "maxWeight": 64
    },
    "positions": [
      {
        "position": 1,
        "athlete": { "name": "João Silva" },
        "team": { "name": "Gracie Barra" }
      }
    ],
    "matches": [
      {
        "round": 1,
        "matchNumber": 1,
        "position1": { "position": 1, "athlete": { "name": "João Silva" }, "team": { "name": "Gracie Barra" } },
        "position2": { "position": 2, "athlete": { "name": "Pedro Lima" }, "team": { "name": "Alliance" } },
        "winner": { "position": 1 },
        "isWO": false,
        "woType": null
      }
    ]
  }
]
```

---

### 2. `GET /api/public/eventos/[id]/resultados`

Retorna apenas os pódios (1º, 2º e 3º lugar) de cada categoria finalizada. Mais leve que `/chaves`, ideal para página de resultados.

**Resposta:**
```json
[
  {
    "belt": "AZUL",
    "isAbsolute": false,
    "weightCategory": {
      "name": "Até 64kg",
      "ageGroup": "ADULTO",
      "sex": "MASCULINO"
    },
    "podio": [
      { "lugar": 1, "medal": "OURO", "athlete": "João Silva", "team": "Gracie Barra" },
      { "lugar": 2, "medal": "PRATA", "athlete": "Pedro Lima", "team": "Alliance" },
      { "lugar": 3, "medal": "BRONZE", "athlete": "Carlos Souza", "team": "GF Team" }
    ]
  }
]
```

Retorna apenas categorias de chaves com status `FINALIZADA` ou `PREMIADA` e que tenham ao menos um atleta com medalha atribuída.

---

### 3. `GET /api/public/eventos/[id]/ranking`

Retorna os rankings de equipes e atletas calculados a partir dos resultados do evento.

**Tabela de pontos** (campo `Registration.medal`):
- `"OURO"` (1º lugar) → 9 pontos
- `"PRATA"` (2º lugar) → 3 pontos
- `"BRONZE"` (3º lugar) → 1 ponto

Apenas inscrições com `teamPoints = true` e `medal` preenchido são consideradas.

**Resposta:**
```json
{
  "equipes": [
    { "team": "Gracie Barra", "pontos": 27 },
    { "team": "Alliance", "pontos": 12 }
  ],
  "atletas": [
    { "athlete": "João Silva", "team": "Gracie Barra", "pontos": 9 },
    { "athlete": "Maria Santos", "team": "Gracie Barra", "pontos": 9 }
  ]
}
```

Pontos de equipe = soma dos pontos de todos os atletas da equipe com `teamPoints = true` neste evento. Ambas as listas são ordenadas por pontos decrescente.

---

## Dados existentes utilizados

| Campo | Origem | Uso |
|---|---|---|
| `Registration.medal` | Atribuído ao finalizar chave | Determina 1º/2º/3º |
| `Registration.teamPoints` | Configurado na inscrição | Filtra pontos de equipe |
| `Registration.awarded` | Marcado ao premiar | Não usado diretamente |
| `BracketPosition.registration` | Join para nome do atleta | Usado em /chaves |
| `Match.winnerId` | Resultado da partida | Usado em /chaves |
| `Bracket.status` | Status da chave | Filtra apenas finalizadas |

## Integração pelo site externo

O programador do site externo deve:

1. Usar `GET /api/public/eventos` para listar eventos disponíveis
2. Para cada evento de interesse, chamar os 3 endpoints acima
3. Para o ranking acumulado: somar os pontos retornados por `/ranking` ao histórico já existente no site externo — o FBJJMMA expõe apenas os pontos do evento específico

Frequência sugerida de polling: a cada 5 minutos durante eventos em andamento, a cada hora fora de eventos.

## Arquivos a criar

```
src/app/api/public/eventos/[id]/chaves/route.ts
src/app/api/public/eventos/[id]/resultados/route.ts
src/app/api/public/eventos/[id]/ranking/route.ts
```

## Fora do escopo

- Autenticação (API é pública)
- Escrita de dados pelo site externo
- Cálculo de ranking acumulado (responsabilidade do site externo)
- Notificações push/webhook
