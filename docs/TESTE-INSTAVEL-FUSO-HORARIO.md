# Teste instável na virada do mês (fuso horário)

Em 30/09/2026, às 22:56 no horário de Brasília, a CI do pull request da branch
`feature_015/licenca-proprietaria` falhou em um teste de reservas. O pull request alterava apenas
`LICENSE`, `package.json` e `README.md`; nenhuma linha de código tinha mudado.

Este documento registra o diagnóstico e a correção, porque o defeito tem uma característica que o
torna fácil de reintroduzir: ele só se manifesta em uma janela de três horas por mês, e fora dela
todos os testes passam.

---

## Resumo

| | |
| --- | --- |
| Data | 30/09/2026, 22:56 em São Paulo (01/10/2026, 01:56 em UTC) |
| Sintoma | `test/reservations.spec.ts` falhou na CI sem alteração de código |
| Causa | o teste calculava o mês corrente em UTC; o serviço, em `America/Sao_Paulo` |
| Impacto | apenas a CI; a produção não foi afetada, porque o endpoint estava correto |
| Correção | o teste passou a usar o mesmo relógio do serviço, e ganhou um cenário de regressão |

---

## O sintoma

```
FAIL  test/reservations.spec.ts > Reservas > GET /api/reservation/current-month
      > traz as reservas do mês corrente
AssertionError: expected [] to have a length of 1 but got +0
```

O teste grava uma reserva no dia 15 do mês corrente e espera que `GET /api/reservation/current-month`,
que alimenta o calendário do frontend, a devolva. A API respondeu com uma lista vazia.

---

## A causa

O serviço e o teste perguntavam "que mês é hoje?" a relógios diferentes.

O serviço usa `nowWallClock()`, que converte o instante atual para o horário de parede de São Paulo,
como descrito na seção "Fuso horário" do README:

```ts
// src/reservations/reservations.service.ts
const now = nowWallClock();
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
```

O teste usava o instante cru, lido em UTC:

```ts
// test/reservations.spec.ts, antes da correção
const now = new Date();
startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 8, 0, 0)),
```

Durante quase todo o mês os dois relógios concordam sobre o mês. No instante da falha, não:

| Relógio | Instante | Mês corrente |
| --- | --- | --- |
| UTC (usado pelo teste) | 01/10/2026 01:56 | outubro |
| São Paulo (usado pelo serviço) | 30/09/2026 22:56 | setembro |

O teste gravou a reserva em 15 de outubro, e a API buscou o período de 1º a 30 de setembro.

---

## Por que passou despercebido

São Paulo está em UTC-3 o ano inteiro, sem horário de verão. Os dois relógios só discordam sobre o
mês no **último dia de cada mês, das 21:00 às 23:59 no horário de Brasília** — cerca de 1% do tempo.

Fora dessa janela o teste passa, localmente e na CI. Bastou o pull request rodar às 22:56 do dia 30
para o defeito aparecer.

Vale notar que o problema **não era o fuso da máquina da CI**. O teste lia os componentes UTC do
`Date`, então falharia na mesma janela em qualquer máquina, inclusive em um computador configurado
com o horário de Brasília.

---

## Impacto

Nenhum na produção. O endpoint sempre calculou o mês no fuso correto; o erro estava apenas na forma
como o teste montava os dados. O efeito prático foi uma CI vermelha bloqueando um pull request sem
relação com o código de reservas.

---

## A correção

Duas mudanças, ambas em `test/reservations.spec.ts`. O código de produção não foi alterado.

**1. O teste usa o mesmo relógio do serviço.**

```ts
const today = nowWallClock();
await insertReservationOnDay15(8000, today.getUTCFullYear(), today.getUTCMonth());
```

**2. Um cenário de regressão fixa o instante exato da virada do mês.**

```ts
// 01/08/2025 01:30 em UTC ainda é 31/07/2025 22:30 em São Paulo: o mês corrente é julho.
const UTC_INSTANT_STILL_JULY_IN_SAO_PAULO = new Date('2025-08-01T01:30:00Z');

vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
vi.setSystemTime(UTC_INSTANT_STILL_JULY_IN_SAO_PAULO);
```

O teste grava uma reserva em 15 de julho e outra em 15 de agosto, e exige que a API devolva só a de
julho. Assim o comportamento da virada do mês é verificado em toda execução, e não apenas quando a
CI calha de rodar na janela crítica.

Duas escolhas nesse cenário são deliberadas:

- **Só o `Date` é simulado** (`toFake: ['Date']`). Timers, o driver do MongoDB em memória e as
  requisições HTTP continuam com o tempo real; simular tudo travaria a comunicação com o banco.
- **O instante simulado fica no passado.** O token de autenticação do teste é emitido com o horário
  real, e a biblioteca `jose` valida a expiração (`exp`) contra o relógio atual. Uma data no passado
  é sempre anterior à expiração, então o token continua válido em qualquer dia em que a suíte rodar.
  Uma data no futuro faria o token parecer expirado.

---

## Como a correção foi validada

- A suíte de reservas foi executada às 23:00 de 30/09/2026 em São Paulo, dentro da janela em que o
  teste antigo falhava, e passou.
- Para provar que o cenário de regressão detecta o defeito de verdade, o serviço foi alterado
  temporariamente para usar `new Date()` no lugar de `nowWallClock()`. O cenário falhou, devolvendo a
  reserva de agosto em vez da de julho (`expected [ 8002 ] to deeply equal [ 8001 ]`). A alteração
  foi desfeita em seguida.
- A suíte completa passou com 306 testes.

Os demais testes que dependem da data atual, os de ocupação de sala em
`test/sections-rooms.spec.ts`, foram revisados. Eles usam janelas de 48 horas para antes e depois do
instante atual e não são afetados pela diferença de fuso.

---

## Regra prática

Em teste, "hoje", "agora" e "mês corrente" devem vir do **mesmo relógio que o código testado usa** —
neste projeto, `nowWallClock()`. Nunca de `new Date()` lido com `getUTC*`.

E todo comportamento que depende de uma fronteira de calendário (virada de dia, de mês ou de ano)
merece um teste com o relógio fixado nessa fronteira. Esperar que a CI rode no horário certo para
encontrar o defeito não é uma estratégia.
