# API FBJJMMA — Referência de Integração

Este documento descreve os endpoints disponíveis para integração com o sistema de chaves e resultados da FBJJMMA.

---

## Informações gerais

- **Base URL:** `https://[dominio-do-sistema]/api/public`
- **Formato:** JSON
- **Autenticação:** Nenhuma (API pública)
- **Método:** GET (somente leitura)

---

## Endpoints disponíveis

### Listar eventos

```
GET /api/public/eventos
```

Retorna a lista de eventos visíveis ao público.

**Parâmetros opcionais:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `upcoming` | `1` | Retorna apenas eventos futuros |
| `limit` | número | Quantidade máxima de resultados (padrão: 20) |

**Resposta:**
```json
[
  {
    "id": "abc123",
    "name": "Campeonato Baiano 2026",
    "city": "Salvador",
    "state": "BA",
    "date": "2026-06-15T00:00:00.000Z",
    "registrationDeadline": "2026-06-01T00:00:00.000Z",
    "registrationOpen": false,
    "status": "ENCERRADO",
    "type": { "name": "Estadual" }
  }
]
```

---

### Chaves de um evento

```
GET /api/public/eventos/{id}/chaves
```

Retorna as chaves (brackets) de um evento com toda a estrutura de partidas e resultados.

**Parâmetros opcionais:**
| Parâmetro | Valores possíveis | Descrição |
|---|---|---|
| `faixa` | `BRANCA`, `AMARELA_LARANJA_VERDE`, `AZUL`, `ROXA`, `MARROM`, `PRETA` | Filtra por faixa |
| `sexo` | `MASCULINO`, `FEMININO` | Filtra por sexo |
| `absoluto` | `1` | Retorna apenas chaves de absoluto |

**Resposta:**
```json
[
  {
    "id": "chave123",
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
      },
      {
        "position": 2,
        "athlete": { "name": "Pedro Lima" },
        "team": { "name": "Alliance" }
      }
    ],
    "matches": [
      {
        "round": 1,
        "matchNumber": 1,
        "position1": {
          "position": 1,
          "athlete": { "name": "João Silva" },
          "team": { "name": "Gracie Barra" }
        },
        "position2": {
          "position": 2,
          "athlete": { "name": "Pedro Lima" },
          "team": { "name": "Alliance" }
        },
        "winner": { "position": 1 },
        "isWO": false,
        "woType": null
      }
    ]
  }
]
```

**Status possíveis da chave:** `EM_ANDAMENTO`, `FINALIZADA`, `PREMIADA`

**Categorias de idade (ageGroup):**
`PRE_MIRIM`, `MIRIM`, `INFANTIL_A`, `INFANTIL_B`, `INFANTO_JUVENIL_A`, `INFANTO_JUVENIL_B`, `JUVENIL`, `ADULTO`, `MASTER_1`, `MASTER_2`, `MASTER_3`, `MASTER_4`, `MASTER_5`, `MASTER_6`

**Tipos de W.O. (woType):** `PESO`, `AUSENCIA`, `DESCLASSIFICACAO`

---

### Resultados (pódios) de um evento

```
GET /api/public/eventos/{id}/resultados
```

Retorna apenas os pódios (1º, 2º e 3º lugar) de cada categoria finalizada. Mais leve que o endpoint de chaves — ideal para páginas de resultados.

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
      { "lugar": 1, "medal": "OURO",   "athlete": "João Silva",  "team": "Gracie Barra" },
      { "lugar": 2, "medal": "PRATA",  "athlete": "Pedro Lima",  "team": "Alliance" },
      { "lugar": 3, "medal": "BRONZE", "athlete": "Carlos Souza","team": "GF Team" }
    ]
  }
]
```

Retorna apenas categorias onde ao menos um atleta possui medalha atribuída.

---

### Ranking de um evento

```
GET /api/public/eventos/{id}/ranking
```

Retorna o ranking de equipes e atletas com os pontos conquistados **neste evento**.

**Tabela de pontos:**
| Medalha | Lugar | Pontos |
|---|---|---|
| OURO | 1º | 9 |
| PRATA | 2º | 3 |
| BRONZE | 3º | 1 |

> **Importante:** Este endpoint retorna apenas os pontos do evento específico. A soma com o histórico acumulado deve ser feita pelo site que consome a API.

**Resposta:**
```json
{
  "equipes": [
    { "team": "Gracie Barra", "pontos": 27 },
    { "team": "Alliance", "pontos": 12 },
    { "team": "GF Team", "pontos": 6 }
  ],
  "atletas": [
    { "athlete": "João Silva",  "team": "Gracie Barra", "pontos": 9 },
    { "athlete": "Maria Santos","team": "Gracie Barra", "pontos": 9 },
    { "athlete": "Pedro Lima",  "team": "Alliance",     "pontos": 3 }
  ]
}
```

Ambas as listas são ordenadas por pontos de forma decrescente.
Pontos de equipe = soma dos pontos de todos os atletas daquela equipe no evento.

---

## Fluxo de integração sugerido

1. Chamar `GET /api/public/eventos` para obter a lista de eventos
2. Para cada evento de interesse, chamar os 3 endpoints acima usando o `id` do evento
3. Para o ranking acumulado: somar os pontos retornados ao histórico existente no seu banco de dados

**Frequência de polling sugerida:**
- Durante evento em andamento: a cada 5 minutos
- Fora de eventos: a cada 1 hora

---

## Observações

- Chaves com status `PENDENTE` ou `DESIGNADA` não são retornadas (ainda não iniciadas)
- Um atleta pode aparecer em duas chaves do mesmo evento: uma de peso e uma de absoluto
- O campo `isAbsolute: true` identifica chaves de absoluto
