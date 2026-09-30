# coffee_rep_gds_backend (TypeScript + MongoDB)

Reescrita do backend de gestão de salas, migrando de **Java/Spring + PostgreSQL (GCP Cloud Run)**
para **NestJS + MongoDB**.

A API replica o contrato HTTP do backend Java **byte a byte**, porque o frontend Angular não é
alterado. Comportamentos considerados incorretos foram reproduzidos de propósito e estão
catalogados em [docs/BUGS-HERDADOS.md](docs/BUGS-HERDADOS.md).

Decisões de arquitetura com contexto que não cabe em comentário de código estão em `docs/`:

- [BUGS-HERDADOS.md](docs/BUGS-HERDADOS.md) — comportamentos do Java replicados de propósito.
- [DEPENDENCIA-CIRCULAR-SETORES-SALAS.md](docs/DEPENDENCIA-CIRCULAR-SETORES-SALAS.md) — por que
  setores e salas dependem do repositório um do outro, e não do serviço.

## Pré-requisitos

- Docker Desktop
- Node.js 20+
- pnpm 11+ (`corepack enable pnpm`)

## Como subir

```bash
cp .env.example .env
pnpm install
pnpm keys:generate --write   # gera o par RSA dos JWTs e grava no .env
pnpm db:up                   # sobe MongoDB + mongo-express
pnpm db:migrate              # importa o dump do Postgres para o Mongo
pnpm seed:admin              # cria o admin inicial, se ainda não existir
pnpm start:dev               # API em http://localhost:8080
```

| Serviço       | URL                                                                |
| ------------- | ------------------------------------------------------------------ |
| API           | http://localhost:8080                                              |
| MongoDB       | `mongodb://gds:gds@localhost:27018/coffee_gds_db?authSource=admin` |
| mongo-express | http://localhost:8081 (usuário `admin`, senha `admin`)             |

A porta **27018** foi escolhida porque a 27017 já está ocupada por outro container Mongo na máquina.
Para mudar, ajuste `MONGO_PORT` no `.env`.

## Scripts

| Script                 | Descrição                                                  |
| ---------------------- | ---------------------------------------------------------- |
| `pnpm start:dev`       | API em modo watch                                          |
| `pnpm build`           | Compila para `dist/`                                       |
| `pnpm start`           | Executa o build                                            |
| `pnpm test`            | Suíte completa (unitários + integração)                    |
| `pnpm typecheck`       | Checagem de tipos                                          |
| `pnpm db:up`           | Sobe os containers                                         |
| `pnpm db:down`         | Para os containers (mantém os dados no volume)             |
| `pnpm db:reset`        | Apaga o volume e sobe do zero                              |
| `pnpm db:migrate`      | Lê o dump SQL e recria as coleções no Mongo (idempotente)  |
| `pnpm seed:admin`      | Cria o admin inicial (idempotente)                         |
| `pnpm db:migrate-roles`| Converte BASIC em COORDINATOR; dry-run sem `--apply`       |
| `pnpm keys:generate`   | Gera o par RSA; com `--write`, grava direto no `.env`      |

`db:migrate` limpa cada coleção antes de inserir, então pode ser rodado quantas vezes for preciso.

Os scripts de CLI aceitam `--env <arquivo>` para escolher o arquivo de ambiente, o que permite
apontar para outro banco sem editar o `.env` local.

## Populando o MongoDB Atlas

1. Copie `.env.atlas.example` para `.env.atlas` e preencha `MONGO_URI` com a string de conexão do
   cluster. O arquivo que o Atlas gera no onboarding chama a variável de `MONGODB_URI` e omite o
   nome do banco; aqui ela precisa se chamar `MONGO_URI` e terminar com `/coffee_gds_db`.
   Senhas com caracteres especiais (`@ : / ? # [ ] %`) precisam ser percent-encoded na URI.
2. Gere um par RSA próprio para esse ambiente: `pnpm keys:generate --write --env .env.atlas`.
3. Libere seu IP em *Network Access* no painel do Atlas.
4. Rode a carga: `pnpm db:migrate --env .env.atlas --yes`.

O `--yes` é obrigatório quando o destino não é local, porque a migração apaga todas as coleções
antes de inserir e um cluster remoto normalmente é o ambiente que não se quer perder por engano.

### Se a conexão falhar com `querySrv ETIMEOUT`

O formato `mongodb+srv://` resolve os nós do cluster por um registro DNS do tipo SRV, e essa
consulta costuma falhar sob VPN ou em redes com DNS restritivo. Use a forma expandida, que não
depende de SRV. Os dados vêm dos próprios registros do cluster:

```powershell
Resolve-DnsName -Type SRV _mongodb._tcp.SEU-CLUSTER.mongodb.net   # hosts e portas
Resolve-DnsName -Type TXT SEU-CLUSTER.mongodb.net                 # authSource e replicaSet
```

E a URI resultante tem esta forma:

```
mongodb://USUARIO:SENHA@host-00:27017,host-01:27017,host-02:27017/coffee_gds_db?ssl=true&replicaSet=NOME&authSource=admin&retryWrites=true&w=majority
```

## Arquitetura

A estrutura espelha a separação do backend Java (`controllers` / `services` / `repositories`), o que
torna a comparação lado a lado direta durante a migração.

```
src/
  main.ts            # entrypoint; a Vercel o detecta automaticamente
  bootstrap.ts       # configuração compartilhada entre produção e testes
  config/            # env tipado e validado com Zod
  common/
    date/            # LocalDateTime sem fuso, "agora" em horário de parede
    errors/          # erros de domínio com os status HTTP do Java
    filters/         # ErrorResponse no formato {status, error, message, path}
    interceptors/    # omissão de nulos (equivale ao Jackson NON_NULL)
    pagination/      # envelope {content, page} e ordenação por recência
    pipes/           # validação Zod (equivale ao @Valid)
    validation/      # CPF, helpers de texto
  database/          # conexão em cache, tipos dos documentos, contadores
  auth/ users/ sections/ rooms/ requesters/ requester-absences/ reservations/ health/
```

Cada módulo de domínio tem `*.controller.ts`, `*.service.ts` (regra de negócio),
`*.repository.ts` (acesso ao Mongo) e `dto/` (schemas Zod).

### Os cinco detalhes de contrato que quebram o frontend em silêncio

Cada um vira um ponto único e testado no código:

1. **Envelope de paginação** `{ content, page: { size, number, totalElements, totalPages } }`. O
   `MatPaginator` lê `page.totalElements`; o formato clássico do Spring exibiria zero itens sem erro.
2. **Omissão de nulos.** Um interceptor global remove chaves nulas da resposta. É por isso que uma
   reserva recorrente responde apenas `{requesterName, roomName, recurrenceId}`.
3. **Datas sem fuso.** `2026-06-02T07:00:00`, sem `Z` nem offset. Emitir `Z` deslocaria o calendário
   do frontend em 3 horas, já que o Angular faz `new Date(horaInicio)`.
4. **`unpaged=true` devolve array puro**, não envelope. `requester-absence` nunca é paginado.
5. **Status de erro não convencionais.** `EntityNotFound` → 400, `EntityAlreadyExists` → 400,
   `BadParameters` → 406. Corpo sempre `{ status, error, message, path }`.

Há também assimetrias de nome a preservar: a escrita usa `telefone`/`observacao`, a leitura devolve
`contato`/`observacoes`; a listagem de reservas usa `reservationId` e campos em português, enquanto a
criação responde em inglês.

### Filtros e ordenação das listagens

Todos os parâmetros abaixo são opcionais e aditivos. Valor desconhecido ou inválido é ignorado
(nunca responde 400), e sem `sort` a ordem continua a de recência, com desempate por id.

| Endpoint | Filtros | `sort` aceito |
|---|---|---|
| `GET /api/room` | `nome`, `setor` (parciais, sem diferenciar maiúsculas), `ocupada` | `nome`, `setor` |
| `GET /api/requester` | `busca` (nome, especialidade ou telefone), `especialidade` (exata, sem diferenciar maiúsculas) | `nome`, `especialidade` |
| `GET /api/reservation` | `inicio` e `fim` (obrigatórios), `busca` (sala, setor, solicitante ou criador), `recorrente=true\|false`, `setorId`, `salaId`, `solicitanteId` | `horaInicio`, `sala`, `solicitante` |
| `GET /api/audit` | `q`, `action`, `entityType`, `createdFrom`, `createdTo` | `createdAt` |

O formato é o do Spring: `sort=campo,asc` ou `sort=campo,desc`. Textos são ordenados com collation
`pt` (ignora acento e maiúsculas), e o desempate por id segue o mesmo sentido. A lista de campos
permitidos fica em `*_SORTABLE_FIELDS`, ao lado de cada repositório.

### Perfis, permissões e pedidos de acesso

Há quatro perfis. Os três primeiros formam a hierarquia operacional, e cada nível inclui o anterior;
o administrador é único (`admin@admin.com`), fica fora dela e não pode ser atribuído nem rebaixado
pela API.

| Permissão | Visualizador | Assistente administrativo | Coordenação | Administrador |
|---|:-:|:-:|:-:|:-:|
| Consultar tudo (salas, reservas, calendário, histórico…) | ✓ | ✓ | ✓ | ✓ |
| `reservation.single.manage`: criar e cancelar reservas pontuais | | ✓ | ✓ | ✓ |
| `absence.manage`: registrar, editar e remover ausências | | ✓ | ✓ | ✓ |
| `reservation.recurring.manage`: reservas recorrentes e ocorrências de série | | | ✓ | ✓ |
| `catalog.manage`: setores, salas e solicitantes | | | ✓ | ✓ |
| `users.manage` e `roleRequests.review`: perfis e pedidos de acesso | | | | ✓ |

A matriz vive num único lugar, `src/auth/permissions.ts`, e as rotas a declaram com
`@RequirePermission(...)`. Toda conta nova nasce **Visualizador**. O guard relê o usuário do banco a
cada requisição, então promoções e rebaixamentos valem na hora, inclusive para tokens já emitidos, e
um usuário removido passa a receber 401. `GET /api/auth/me` devolve o perfil e as permissões
calculadas, e é por ele que o frontend decide o que mostrar.

Reservas têm uma regra a mais, que depende do corpo: a rota exige `reservation.single.manage`, e o
serviço exige `reservation.recurring.manage` para `fixo: true` e para cancelar qualquer ocorrência
que tenha `recurrenceId`.

Pedidos de acesso (`/api/role-request`):

- Qualquer usuário pede um perfil acima do atual, com justificativa de 10 a 500 caracteres. Um
  índice único parcial garante no máximo um pedido pendente por pessoa.
- Só o administrador aprova ou recusa. O fechamento é um `findOneAndUpdate` condicionado a
  `status: PENDING`, o que impede aprovação dupla em cliques simultâneos.
- `PATCH /api/user/:id/role` troca o perfil diretamente e cancela o pedido pendente da pessoa.
- Tudo é registrado na auditoria (`role_request.*` e `user.role_change`).

Cada pedido novo envia um e-mail pelo [Resend](https://resend.com) para `ADMIN_NOTIFICATION_EMAILS`,
com o link "Analisar pedido" apontando para `FRONTEND_URL/admin`. O envio é aguardado (a Vercel pode
congelar trabalho iniciado depois da resposta), com limite de 5 segundos, e nunca derruba a
requisição: sem chave, sem destinatários ou com falha no Resend, o pedido é gravado e fica só um
aviso no log. Sem domínio verificado, o remetente precisa ser `onboarding@resend.dev` e o Resend só
entrega para o e-mail dono da conta.

| Variável | Uso |
|---|---|
| `RESEND_API_KEY` | Chave da API do Resend. Vazia desliga o envio. |
| `MAIL_FROM` | Remetente; padrão `Gestão de Salas <onboarding@resend.dev>`. |
| `ADMIN_NOTIFICATION_EMAILS` | Destinatários, separados por vírgula. |
| `FRONTEND_URL` | Base do frontend, usada no link do e-mail. |

#### Migração dos perfis

Os usuários do modelo antigo são `BASIC`. Enquanto a migração não roda, o backend já trata `BASIC`
como Coordenação, então a ordem de deploy é segura. A migração converte o valor gravado, confere
se há exatamente um ADMIN e cria os índices de `roleRequests`:

```bash
pnpm db:migrate-roles                                    # dry-run: só mostra o que mudaria
pnpm db:migrate-roles --apply                            # banco do .env
pnpm db:migrate-roles --env .env.atlas --apply --yes     # Atlas (--yes obrigatório fora do local)
```

### Fuso horário

Os dados foram importados como **horário de parede em UTC**. Toda escrita usa `nowWallClock()`, que
converte o instante atual para o fuso da aplicação (`America/Sao_Paulo`) antes de gravar. Usar
`new Date()` cru seria um bug silencioso: às 09:00 em São Paulo o instante UTC é 12:00, e o cálculo
de sala ocupada apontaria a sala errada.

## Modelo de dados

O dump vive em `../db-backup/gestao-salas-dump.sql` (configurável via `DUMP_PATH`).

| Postgres                                   | MongoDB                                         |
| ------------------------------------------ | ----------------------------------------------- |
| `tb_users` + `tb_roles` + `tb_users_roles` | `users` (roles embutidas como array de strings) |
| `tb_sections`                              | `sections`                                      |
| `tb_rooms`                                 | `rooms`                                         |
| `tb_requesters`                            | `requesters`                                    |
| `tb_requester_absence`                     | `requesterAbsences`                             |
| `tb_reservations`                          | `reservations`                                  |
| sequences                                  | `counters`                                      |
| (novo)                                     | `roleRequests` (pedidos de acesso)              |

Decisões da modelagem:

- **Ids numéricos preservados como `_id`.** O frontend já trabalha com ids numéricos, então manter
  os ids originais evita quebrar o contrato da API e dispensa uma tabela de/para na migração.
  A coleção `counters` guarda o maior id de cada coleção, fazendo o papel das sequences.
- **Relacionamentos por referência** (`sectionId`, `roomId`, `requesterId`, `updatedBy`) em vez de
  documentos embutidos: reservas são consultadas por período de forma independente das salas, e
  salas/solicitantes são editados sozinhos.
- **Roles embutidas no usuário**: são poucas (`VIEWER`, `ASSISTANT`, `COORDINATOR`, `ADMIN` e o
  legado `BASIC`), o que não justifica duas coleções.
- **Datas.** As colunas eram `timestamp without time zone` (horário de parede, sem fuso). São
  interpretadas como UTC na importação, de modo que o valor exibido continua idêntico ao do
  Postgres — uma reserva às 07:00 permanece às 07:00.
- **`recurrenceId`** era um `MAX + 1` sem lock, sujeito a corrida. Virou um contador atômico em
  `counters`, com a mesma semântica e sem a condição de corrida.

Índices criados pela migração: únicos em `users.email`, `users.cpf` e `sections.name`; de consulta
em `rooms(sectionId, name)`, `reservations(roomId, startDate, endDate)`,
`reservations(requesterId, startDate)`, `reservations(recurrenceId)` e
`requesterAbsences(requesterId, startDate)`.

## Testes

```bash
pnpm test
```

Os testes de integração sobem a aplicação real contra um MongoDB em memória, aplicando o mesmo
`bootstrap.ts` de produção — sem isso, as asserções sobre formato de resposta não provariam nada
sobre o comportamento real. Eles afirmam o **formato exato**: envelope de paginação, omissão de
nulos, datas sem fuso e status de erro.

Os testes unitários cobrem onde o risco se concentra: geração de slots recorrentes, detecção de
sobreposição (intervalo semiaberto — reservas adjacentes não conflitam), formatação de data sem
fuso e validação de CPF.

## Deploy na Vercel

A aplicação inteira vira uma única Vercel Function, servida por `api/index.js`, que delega para
`src/serverless.ts`. Esse wrapper é necessário: o `src/main.ts` chama `app.listen()`, formato de
servidor de longa duração que a plataforma não invoca — sem o handler o build passa, nenhuma função
é criada e toda requisição falha com `FUNCTION_INVOCATION_FAILED`.

O handler é JavaScript puro e importa do `dist/` de propósito. A Vercel compila a pasta `api/` com
esbuild, que não emite os metadados de decorator exigidos pela injeção de dependências do NestJS;
o `dist/` é gerado pelo `nest build`, que usa o tsc e os emite corretamente.

Pelo mesmo motivo o `vercel.json` declara `"framework": null`. Deixada à própria sorte, a plataforma
reconhece o projeto como NestJS e aplica um preset que gera uma segunda função a partir do
`src/main.ts` — compilada com esbuild e, portanto, sem os metadados. Como essa função responde na
raiz, ela captura o tráfego e derruba toda requisição com `FUNCTION_INVOCATION_FAILED`.

O `jose` está preso à linha 5 de propósito. A versão 6 abandonou o build CommonJS e passou a ser
distribuída só como ESM; o `require` gerado pelo nosso build morre no runtime da Vercel com
`ERR_REQUIRE_ESM`. O Node local tolera esse `require` desde a versão 22, então a falha não aparece
em desenvolvimento nem nos testes — só em produção. Só atualize para a 6 junto com a migração do
projeto para ESM.

Sem preset, porém, a plataforma passa a esperar um diretório de saída estático e recusa o build sem
ele. Daí a pasta `public/`, com uma página única que apenas identifica o serviço: é o preço de não
ter framework declarado. Ela responde só em `/`; todo o resto é reescrito para a função.

O restante do desenho já respeita as restrições do modelo serverless:

- **Nada de trabalho no boot.** O admin inicial é um script de CLI, não um hook de inicialização que
  rodaria a cada cold start.
- **Conexão com o Mongo em cache de módulo**, com `maxPoolSize` baixo, para não estourar o limite de
  conexões do Atlas conforme a função escala.
- **Filesystem somente leitura.** As chaves RSA vêm de variáveis de ambiente.
- **Sem estado em memória e sem processos de fundo.**

Cold start continua existindo, mas o frontend já faz warmup: o `APP_INITIALIZER` do Angular chama
`GET /api/health` na abertura. Esse endpoint é público.

Dois pontos dependem de configuração fora do código:

- **Atlas**: o Network Access precisa liberar `0.0.0.0/0`, porque os IPs de saída da Vercel são
  dinâmicos. A proteção fica por conta da autenticação do banco e de uma senha forte.
- **Plano Hobby é restrito a uso pessoal e não comercial** pelos termos da Vercel. Sendo um sistema
  de hospital universitário, vale confirmar antes de depender do plano gratuito.

No momento do deploy também é preciso apontar `apiUrl` em `src/environments/environment.prod.ts` do
frontend para a nova URL, e incluir a origem do frontend em `CORS_ORIGINS`.

### Ordem de deploy dos perfis

1. Cadastre `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFICATION_EMAILS` e `FRONTEND_URL` nas
   variáveis de ambiente da Vercel.
2. Publique o backend. Como `BASIC` já vale como Coordenação, ninguém perde acesso.
3. Rode `pnpm db:migrate-roles --env .env.atlas` (dry-run), confira a lista e repita com
   `--apply --yes`.
4. Publique o frontend, que depende de `GET /api/auth/me`.
