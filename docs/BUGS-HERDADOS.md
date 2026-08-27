# Bugs e comportamentos herdados do backend Java

A migração para NestJS foi feita com o compromisso de **manter o contrato HTTP byte a
byte**, porque o frontend Angular não seria alterado. Isso significa que comportamentos
que consideramos incorretos foram replicados de propósito, e não corrigidos.

Este documento existe para que a decisão de corrigir cada um seja tomada depois, de forma
consciente, e não descoberta por acidente. Cada item traz o comportamento atual, por que
ele é problemático, e o que muda para o usuário se for corrigido.

Os itens estão ordenados por impacto.

---

## 1. Sala ocupada é decidida ignorando o setor da reserva

**Onde:** `GET /api/room` (campo `ocupada`).

**Comportamento:** uma sala é considerada ocupada se existir reserva aprovada cujo
intervalo contém o instante atual. Se o profissional dessa reserva estiver em ausência
cadastrada para o dia de hoje, a sala volta a contar como livre.

**Por que é arriscado:** a regra "ausência libera a sala" foi criada para o caso de férias,
mas ela vale para qualquer ausência, inclusive uma cadastrada por engano. Uma sala com
reserva legítima em andamento pode aparecer como livre e ser reservada por outra pessoa.

**Se corrigido:** salas com reserva vigente passariam a aparecer sempre como ocupadas, e
o hospital precisaria de outro mecanismo para liberar sala de profissional ausente.

---

## 2. Atualizar sala não verifica nome duplicado

**Onde:** `PUT /api/room/{id}`.

**Comportamento:** a criação (`POST /api/room`) recusa uma sala com nome já usado no mesmo
setor, mas a atualização não faz essa checagem. Dá para criar duas salas homônimas no
mesmo setor renomeando uma delas, ou movendo uma sala para um setor que já tem uma sala
com aquele nome.

**Por que é arriscado:** o usuário passa a ver duas linhas idênticas na lista de salas e
não tem como saber qual reservar.

**Se corrigido:** a tela de edição passaria a exibir o erro "Já existe uma sala com este
nome!" em casos que hoje são aceitos.

---

## 3. Verificação de nome duplicado de setor nunca disparava

**Onde:** `PUT /api/section/{id}`.

**Comportamento no Java:** o código busca um setor pelo nome enviado e, se encontrar um
ativo, só rejeita quando `!dto.nome().equals(nameSearchedSection.getName())`. Como o
registro foi encontrado justamente por esse nome, a comparação é sempre falsa e a exceção
nunca era lançada — a validação existia mas não funcionava.

**O que fizemos aqui:** esta é a **única divergência intencional de comportamento** desta
migração. A comparação passou a ser por id (`outro setor ativo com este nome`), que é o
que a regra evidentemente pretendia. O motivo é que manter o bug significaria permitir
setores homônimos ativos, contrariando a validação que já existe na criação e o índice
único de nome na coleção `sections`.

**Impacto:** renomear um setor para o nome de outro setor ativo agora responde 400. Antes,
era aceito.

---

## 4. Solicitante inativo continua recebendo reservas

**Onde:** `POST /api/reservation` e `POST /api/requester-absence`.

**Comportamento:** o `RequesterDomainService` busca o solicitante por id sem filtrar
status. Um solicitante excluído (soft delete) some das listagens, mas continua aceitando
reservas novas se o id for enviado diretamente.

**Por que é arriscado:** a reserva criada aparece no calendário com o nome de alguém que
foi removido do sistema, e não há como escolhê-lo de novo pela interface para corrigir.

**Se corrigido:** requisições com solicitante inativo passariam a responder 400.

---

## 5. Excluir setor não cancela as reservas das salas afetadas

**Onde:** `DELETE /api/section/{id}`.

**Comportamento:** o soft delete do setor cascateia para as salas, que ficam inativas. As
reservas dessas salas continuam aprovadas e continuam aparecendo nas listagens e no
calendário.

**Por que é arriscado:** o calendário mostra reservas em salas que não existem mais para
efeito de cadastro, e não há tela para cancelá-las (a sala não aparece mais nos filtros).

**Se corrigido:** seria preciso decidir entre cancelar as reservas futuras junto ou
bloquear a exclusão de setores com reservas pendentes.

---

## 6. Cancelar uma série cancela também as ocorrências passadas

**Onde:** `DELETE /api/reservation/recurrent/{id}`.

**Comportamento:** o `UPDATE` por `recurrenceId` não filtra por data. Cancelar uma reserva
fixa criada há seis meses marca como canceladas todas as ocorrências, inclusive as que já
aconteceram.

**Por que é arriscado:** o histórico de uso das salas é perdido, e relatórios sobre o
passado mudam retroativamente.

**Se corrigido:** o cancelamento passaria a valer só da data atual em diante.

---

## 7. Reserva fixa reaproveita os extremos como horário das ocorrências

**Onde:** `POST /api/reservation` com `fixo: true`.

**Comportamento:** `horaInicio` e `horaFim` acumulam dois papéis. As **datas** delimitam o
período da recorrência, e as **horas** viram o horário de cada ocorrência. Enviar
`2026-08-24T08:00` e `2026-09-07T10:00` com `dias: [1]` cria três reservas das 08:00 às
10:00, nas segundas.

**Por que é confuso:** se a hora final for menor que a inicial (por exemplo, 14:00 até
09:00), cada ocorrência é gerada com fim antes do início, e a validação de intervalo não
percebe — ela compara os datetimes completos, em que a data final é maior.

**Se corrigido:** o DTO precisaria de campos separados para o período e para o horário, o
que exige mudança no frontend.

---

## 8. Endpoint de tipo de solicitante ficou órfão

**Onde:** `GET /api/requester/type/{requesterTypeId}`.

**Comportamento:** a tabela de tipos de solicitante foi removida do modelo, mas a rota
continuou. Hoje ela ignora o id do caminho e se comporta exatamente como
`GET /api/requester`.

**Se corrigido:** a rota seria removida, depois de confirmar que o frontend não a chama.

---

## 9. `GET /api/user` expunha o hash da senha

**Onde:** `GET /api/user`.

**Comportamento no Java:** o endpoint devolve a entidade JPA `User` inteira, incluindo o
campo `password` com o hash BCrypt.

**O que fizemos aqui:** o campo **não** é exposto. Esta é a segunda e última divergência
intencional. Replicar o vazamento seria criar um problema de segurança novo, não preservar
um contrato — até porque o endpoint não é consumido pelo frontend.

---

## 10. Status de erro fora da convenção HTTP

**Onde:** toda a API.

**Comportamento:** `EntityNotFound` responde **400** em vez de 404, `EntityAlreadyExists`
responde **400** em vez de 409, e `BadParameters` responde **406** em vez de 400 ou 422.

**Por que importa:** o frontend Angular trata 400 e 406 como "erro de negócio, mostre a
mensagem", e trata 404 como erro genérico. Mudar os status quebraria as mensagens de erro
em praticamente todas as telas.

**Se corrigido:** exige alterar o tratamento de erro do frontend na mesma entrega.

---

## 11. Login não verifica se o usuário está ativo

**Onde:** `POST /api/auth/login`.

**Comportamento:** a autenticação valida CPF e senha, mas não olha o campo `status`. Um
usuário inativado continua conseguindo entrar.

**Se corrigido:** usuários inativos passariam a receber 401.

---

## 12. `?sort=` enviado pelo cliente é ignorado

**Onde:** todas as listagens paginadas.

**Comportamento:** a ordenação é fixa em `GREATEST(updatedAt, createdAt) DESC`, imposta
dentro das Specifications, o que sobrescreve qualquer `sort` do `Pageable`.

**Nota da migração:** foi acrescentado um desempate por id decrescente, porque os dados
migrados têm `createdAt` idêntico em lotes inteiros e, sem o desempate, a ordem entre eles
variaria de uma requisição para outra. Isso não altera a ordenação percebida, apenas a
torna estável.

---

## Divergências intencionais, em resumo

Só três pontos fogem da replicação literal, e todos foram escolhas conscientes:

| # | Ponto | Motivo |
|---|---|---|
| 3 | Nome duplicado de setor passou a ser detectado | Manter o bug permitiria violar o índice único da coleção |
| 9 | Hash de senha não é mais exposto em `GET /api/user` | Replicar seria criar uma falha de segurança nova |
| 12 | Desempate por id na ordenação | Torna estável uma ordem que os dados migrados deixavam ambígua |

Além disso, dois pontos deixaram de ser exceções não tratadas (que resultariam em 500) e
passaram a ter comportamento definido, sem mudar nenhum caso de sucesso:

- `PUT /api/room/{id}` sem `setorId` mantém o setor atual, em vez de estourar
  `NullPointerException`.
- `pnpm seed:admin` verifica CPF **e** e-mail antes de inserir, em vez de quebrar com
  violação de índice único numa base que já tenha `admin@admin.com`.
