# Deploy no Google Cloud Run + Cloud SQL (PostgreSQL)

Projeto de exemplo: `plated-shelter-495618-d9`. Ajuste região, nomes e IDs.

## 1. APIs necessárias (Cloud Shell)

```bash
gcloud config set project plated-shelter-495618-d9

gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com
```

## 2. Service Accounts — build (CI) vs runtime (Cloud Run)

Duas identidades separadas: uma para o **Cloud Build** (build, push, `gcloud run deploy`) e outra para o **processo que roda no Cloud Run** (ler secrets, conectar ao Cloud SQL). Substitua `PROJECT_ID` se for diferente de `plated-shelter-495618-d9`.

```bash
export PROJECT_ID=plated-shelter-495618-d9
gcloud config set project "${PROJECT_ID}"

# --- Criar contas (uma vez) ---
gcloud iam service-accounts create coffee-rep-cloud-build \
  --display-name="Coffee Rep — Cloud Build / deploy"
gcloud iam service-accounts create coffee-rep-cloud-run \
  --display-name="Coffee Rep — Cloud Run runtime"

export BUILD_SA="coffee-rep-cloud-build@${PROJECT_ID}.iam.gserviceaccount.com"
export RUN_SA="coffee-rep-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

# --- Runtime: só o que o JAR precisa ---
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/cloudsql.client"

for SECRET in jwt-private jwt-public coffee-gds-app-password; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor"
done

# --- Build: Artifact Registry, Cloud Run e “assumir” a SA de runtime no deploy ---
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding "${RUN_SA}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

**Trigger (GitHub):** em Cloud Build → Triggers → editar o gatilho → **Service account** = `coffee-rep-cloud-build@...` (não use a default “Compute default” se quiser este modelo). O arquivo `cloudbuild.yaml` também declara `serviceAccount` apontando para a mesma conta de build.

**Segurança:** `ADMIN_PASSWORD` no pipeline aparece em substituições/logs; para produção, prefira outro secret no Secret Manager e monte como env ou use apenas deploy manual da seção 6.

## 3. Cloud SQL — instância barata (desenvolvimento)

Menor tier usual para Postgres: `db-f1-micro` (compartilhado). Região barata comum: `us-central1`.

### Senha do usuário `postgres` (root da instância)

Use o segredo **`coffee-gds-db-root-password`** ao criar a instância (crie esse secret antes no Secret Manager).  
Quem sobe a instância precisa poder ler o segredo (`roles/secretmanager.secretAccessor` na sua conta ou no Cloud Shell). O **Cloud Run não usa** esse segredo — só o seu usuário / CI ao rodar `gcloud sql`.

```bash
export REGION=us-central1
export INSTANCE_NAME=coffee-gds-db

export ROOT_PASSWORD="$(gcloud secrets versions access latest --secret=coffee-gds-db-root-password)"

gcloud sql instances create "${INSTANCE_NAME}" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="${REGION}" \
  --availability-type=zonal \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --root-password="${ROOT_PASSWORD}"
```

Se `db-f1-micro` não estiver disponível na região, o comando sugere alternativas ou use `db-g1-small` (um pouco mais caro).

### Senha do usuário da API (`coffee_gds_app`) — Secret Manager

Use o segredo **`coffee-gds-app-password`** como **única fonte** da senha do usuário **`coffee_gds_app`** (não confunda com `coffee-gds-db-root-password`, que é só para o `postgres` root).

Se ainda não existir o segredo, crie com um valor forte (guarde só no Secret Manager):

```bash
# Exemplo: gerar e gravar de uma vez (Linux/macOS Cloud Shell)
openssl rand -base64 32 | gcloud secrets create coffee-gds-app-password --data-file=-

# Ou, se o segredo já foi criado manualmente no Console, pule a criação.
```

Para **rotacionar** ou definir novo valor:

```bash
openssl rand -base64 32 | gcloud secrets versions add coffee-gds-app-password --data-file=-
```

Depois alinhe o usuário no Cloud SQL ao valor atual do segredo (veja abaixo).

### Banco e usuário da aplicação

Depois da instância criada, crie o banco e o usuário **`coffee_gds_app`** (senha vinda de **`coffee-gds-app-password`**):

```bash
export DB_NAME=coffee_gds_db
export DB_APP_USER=coffee_gds_app

export DB_APP_PASSWORD="$(gcloud secrets versions access latest --secret=coffee-gds-app-password)"

gcloud sql databases create "${DB_NAME}" --instance="${INSTANCE_NAME}"

gcloud sql users create "${DB_APP_USER}" \
  --instance="${INSTANCE_NAME}" \
  --password="${DB_APP_PASSWORD}"
```

Se o usuário **`coffee_gds_app`** já existir e você mudou o segredo, atualize a senha no Postgres:

```bash
export DB_APP_PASSWORD="$(gcloud secrets versions access latest --secret=coffee-gds-app-password)"
gcloud sql users set-password "${DB_APP_USER}" \
  --instance="${INSTANCE_NAME}" \
  --password="${DB_APP_PASSWORD}"
```

**Connection name** (anote para o Cloud Run):

```bash
gcloud sql instances describe "${INSTANCE_NAME}" --format='value(connectionName)'
# Ex.: plated-shelter-495618-d9:us-central1:coffee-gds-db
```

## 4. JDBC no Cloud Run (Unix socket)

Com a dependência `postgres-socket-factory` no `pom.xml`, use esta forma de URL (sem IP público):

```text
jdbc:postgresql:///${DB_NAME}?cloudSqlInstance=${INSTANCE_CONNECTION_NAME}&socketFactory=com.google.cloud.sql.postgres.SocketFactory
```

Defina `INSTANCE_CONNECTION_NAME` como o connection name completo (projeto:região:instância).

Variáveis já esperadas pelo `application-prod.properties`:

- `APP_PROFILE=prod`
- `DB_URL` = JDBC acima
- `DB_USERNAME` = usuário da aplicação (`coffee_gds_app`)
- `DB_PASSWORD` = injetado pelo Cloud Run a partir do segredo **`coffee-gds-app-password`** (`--set-secrets`, não coloque a senha em texto no Console)
- `ADMIN_CPF`, `ADMIN_PASSWORD` (obrigatórios no perfil prod)
- `CORS_ORIGINS` = URL(s) do frontend em produção (ex.: `https://gestao-salas-hu.vercel.app`). Use uma origem por vez na substituição do Cloud Build para não quebrar `--set-env-vars`; várias origens exigem delimitador alternativo no `gcloud run deploy` (ver documentação).

## 5. Chaves JWT (Secret Manager)

O `Dockerfile.cloudrun` **não** inclui `app.key` / `app.pub`. Em produção o par RSA (PEM) fica no **Secret Manager** e o Cloud Run monta como arquivos em `/secrets/`.

São **dois segredos binários de texto PEM**, não senhas Base64 genéricas: use **OpenSSL** para gerar o par RSA (2048 bits).

### Opção A — Google Cloud Shell (recomendado)

Não é obrigatório clonar o repositório: basta gerar os PEM no diretório atual e enviar ao Secret Manager.

```bash
# Projeto já selecionado (ex.: plated-shelter-495618-d9)
openssl genpkey -algorithm RSA -out app.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in app.key -out app.pub

gcloud secrets create jwt-private --data-file=app.key
gcloud secrets create jwt-public  --data-file=app.pub
```

Saída esperada ao criar: `Created version [1] of the secret [jwt-private]` (e o mesmo para `jwt-public`).

Se o segredo **já existir** (nova versão da chave):

```bash
gcloud secrets versions add jwt-private --data-file=app.key
gcloud secrets versions add jwt-public  --data-file=app.pub
```

Opcional — remover cópia local após o upload: `rm app.key app.pub`.

### Opção B — máquina local com repo clonado

Se gerar as chaves dentro do backend (equivalente ao README):

```bash
gcloud secrets create jwt-private --data-file=src/main/resources/app.key
gcloud secrets create jwt-public  --data-file=src/main/resources/app.pub
```

(`app.key` / `app.pub` não vêm do Git; gere antes com OpenSSL na pasta correta.)

### IAM — runtime pode ler os segredos

Permissão para a SA de runtime do Cloud Run (mesma `RUN_SA` da seção 2):

```bash
export PROJECT_ID=plated-shelter-495618-d9
export RUN_SA="coffee-rep-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding jwt-private \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding jwt-public \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding coffee-gds-app-password \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploy Cloud Run

Montagem dos PEM e variáveis esperadas pelo Spring.

**Importante (Cloud Run):**

1. O caminho de montagem **precisa** estar na forma `/<diretório>/<arquivo>` (pelo menos dois segmentos). Caminhos como `/jwt-private.pem` na raiz são **rejeitados** (`Mount path must be in the form /<mountPath>/<path>`).

2. Não monte dois segredos **no mesmo diretório pai** (ex.: `/secrets/a.pem` e `/secrets/b.pem`). Use **um diretório de montagem por segredo**, por exemplo:

- `JWT_PRIVATE_KEY=file:/jwt-private/jwt-private.pem`
- `JWT_PUBLIC_KEY=file:/jwt-public/jwt-public.pem`

Flags típicas (alinhadas ao `cloudbuild.yaml`):

```text
--set-secrets=/jwt-private/jwt-private.pem=jwt-private:latest,/jwt-public/jwt-public.pem=jwt-public:latest
--set-env-vars=JWT_PRIVATE_KEY=file:/jwt-private/jwt-private.pem,JWT_PUBLIC_KEY=file:/jwt-public/jwt-public.pem
```

(O segredo `DB_PASSWORD=…` continua na mesma flag `--set-secrets`, separado por vírgula.)

## 6. Artifact Registry + Cloud Build

### Repositório Docker no Artifact Registry (uma vez por projeto/região)

```bash
export REGION=us-central1
export REPO=coffee-rep

gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Coffee Rep"
```

Se o comando responder que o repositório já existe, pode ignorar.

### Fluxo principal: gatilho (trigger) no GitHub **sem** clonar no Cloud Shell

Quando o **Cloud Build** já está conectado ao repositório GitHub, cada push (ou PR, conforme você configurou) **baixa o código dos servidores do GitHub dentro da infraestrutura do Google**. Nesse cenário **não** é preciso dar `git clone` no Cloud Shell só para buildar: o trigger usa o commit remoto e o arquivo `cloudbuild.yaml` **versionado no repo**.

Confira no Console (**Cloud Build → Triggers**) que:

- O trigger aponta para o **branch** correto (ex.: `develop` / `main`).
- O **arquivo de configuração** é o caminho real no Git — se o backend está em pasta, use algo como `coffee_rep_gds_backend/cloudbuild.yaml` (ajuste ao seu monorepo).
- A **service account** do trigger é a de build (`coffee-rep-cloud-build@...`), se você seguiu a seção 2.

Depois disso, o fluxo típico é: **commit + push** → Cloud Build roda → imagem no Artifact Registry → deploy no Cloud Run (se estiver no `cloudbuild.yaml`).

### Opcional: `gcloud builds submit` manual (teste ou sem trigger)

Use só quando quiser disparar build **sem** passar pelo Git (teste rápido, ou repo ainda não ligado ao trigger). Aí o Cloud Build precisa receber **código**: ou você executa o comando **na pasta** que contém `Dockerfile.cloudrun` e `cloudbuild.yaml`, ou envia um tarball.

Exemplo se você **tiver** o projeto clonado no Cloud Shell **apenas** para esse teste:

```bash
cd ~/caminho/para/coffee_rep_gds_backend

gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=${REGION},_REPO_NAME=${REPO},_IMAGE_NAME=coffee-rep-api,_TAG=v1 .
```

(`REGION` e `REPO` exportados como acima; o `.` é o contexto Docker.)

### Opcional: GitHub Actions + Workload Identity Federation (comandos no Cloud Shell)

Use só se você mantiver um workflow em `.github/workflows` que chame `gcloud` com OIDC (por exemplo `gcloud builds submit` ou `gcloud builds triggers run`). O fluxo **recomendado neste repo** é só o **trigger Cloud Build** ligado ao GitHub — **não exige** workflow nem secrets `GCP_*`. Execute estes comandos no **Cloud Shell** apenas se for usar Actions de novo.

**`GITHUB_REPO`** não é caminho do Windows: é **`organização/nome-do-repo`** como na URL.

Para este projeto (organização **DCOMP-UFS**, repositório **`coffee_rep_gds_backend`**):

`https://github.com/DCOMP-UFS/coffee_rep_gds_backend` → use **`DCOMP-UFS/coffee_rep_gds_backend`** (respeite maiúsculas/minúsculas iguais à URL).

```bash
# ---------- Variáveis ----------
export PROJECT_ID="plated-shelter-495618-d9"
export GITHUB_REPO="DCOMP-UFS/coffee_rep_gds_backend"
export POOL_NAME="github-actions-pool"
export PROVIDER_NAME="github-oidc"
export SA_NAME="github-actions-wif"

gcloud config set project "${PROJECT_ID}"
export PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"

# APIs necessárias para WIF + submit no Cloud Build
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  iam.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  serviceusage.googleapis.com

# ---------- Pool + Provider OIDC (GitHub Actions) ----------
gcloud iam workload-identity-pools create "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions pool"

# Provider OIDC — incluir --attribute-condition com claims assertion.* (exigência atual da API).
# Cole o bloco inteiro de uma vez. GITHUB_REPO deve ser igual ao claim repository do GitHub (org/repo).
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == \"${GITHUB_REPO}\""

# ---------- Service account usada pelo GitHub Actions ----------
gcloud iam service-accounts create "${SA_NAME}" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions WIF (gcloud builds submit)"

export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"

# Obrigatório para `gcloud builds submit` a partir do GitHub Actions (upload no bucket *_cloudbuild):
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

# Permite uso de APIs habilitadas (serviceusage.services.use) — corrige erro ao acessar bucket Cloud Build:
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"

# Só este repositório GitHub pode federar nesta SA
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}"

# ---------- Valores para GitHub → Secrets ----------
export WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

echo "GCP_PROJECT_ID=${PROJECT_ID}"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=${WIF_PROVIDER}"
echo "GCP_WIF_SERVICE_ACCOUNT=${SA_EMAIL}"
```

**Se o `create-oidc` falhou** (colagem quebrada no Shell ou `INVALID_ARGUMENT`): o pool pode existir sem provider. Confira:

```bash
gcloud iam workload-identity-pools providers describe github-oidc \
  --location=global \
  --workload-identity-pool=github-actions-pool \
  --project=plated-shelter-495618-d9
```

Se **NOT_FOUND**, rode **apenas** o comando `gcloud iam workload-identity-pools providers create-oidc ...` do script acima (bloco completo, mapeamento mínimo). Se **`SA já existe`**, pule o `service-accounts create` e defina `SA_EMAIL=github-actions-wif@plated-shelter-495618-d9.iam.gserviceaccount.com` antes dos `add-iam-policy-binding`.

Se usar Actions: cadastre (**Settings → Secrets and variables → Actions**) `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_WIF_SERVICE_ACCOUNT`.

**Monorepo:** em workflows opcionais, use `BACKEND_PATH` = pasta do backend; **`.github/workflows`** na raiz do repo clonado pelo GitHub.

Com **Trigger Cloud Build** em push, **não** mantenha um segundo workflow no mesmo evento sem necessidade — evita **dois builds** por commit.

## 7. Deploy Cloud Run (manual ou primeira vez)

Substitua `IMAGE_URL`, `INSTANCE_CONNECTION_NAME`, `ADMIN_*` e `CORS_ORIGINS`.  
**`DB_PASSWORD`** vem do Secret **`coffee-gds-app-password`** — não passe senha em `--set-env-vars`. Use **`--service-account`** com a SA de runtime (`coffee-rep-cloud-run@...`).

```bash
export REGION=us-central1
export SERVICE=coffee-rep-api
export INSTANCE_CONNECTION_NAME=plated-shelter-495618-d9:us-central1:coffee-gds-db
export IMAGE_URL=${REGION}-docker.pkg.dev/plated-shelter-495618-d9/coffee-rep/coffee-rep-api:v1

export DB_URL="jdbc:postgresql:///coffee_gds_db?cloudSqlInstance=${INSTANCE_CONNECTION_NAME}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
export RUN_SA_EMAIL=coffee-rep-cloud-run@plated-shelter-495618-d9.iam.gserviceaccount.com

gcloud run deploy "${SERVICE}" \
  --image="${IMAGE_URL}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="${RUN_SA_EMAIL}" \
  --add-cloudsql-instances="${INSTANCE_CONNECTION_NAME}" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --set-env-vars="SPRING_PROFILES_ACTIVE=prod,APP_PROFILE=prod,DB_URL=${DB_URL},DB_USERNAME=coffee_gds_app,ADMIN_CPF=SEU_CPF,ADMIN_PASSWORD=SUA_SENHA_ADMIN,CORS_ORIGINS=https://gestao-salas-hu.vercel.app,JWT_PRIVATE_KEY=file:/jwt-private/jwt-private.pem,JWT_PUBLIC_KEY=file:/jwt-public/jwt-public.pem" \
  --set-secrets="DB_PASSWORD=coffee-gds-app-password:latest,/jwt-private/jwt-private.pem=jwt-private:latest,/jwt-public/jwt-public.pem=jwt-public:latest"
```

- **`DB_PASSWORD=coffee-gds-app-password:latest`** expõe o conteúdo do segredo como variável de ambiente `DB_PASSWORD` (o Spring lê em `application-prod.properties`).
- Os outros **`--set-secrets`** montam os arquivos PEM das chaves JWT.

A URL do serviço aparece no final do comando. Use `https://.../api/...` no `environment.prod.ts` do Angular.

### Cold start e `--min-instances`

O primeiro request após um período sem tráfego pode demorar enquanto o Cloud Run sobe o container (Spring Boot costuma levar dezenas de segundos). O frontend Angular dispara **`GET /api/health`** no bootstrap (`APP_INITIALIZER`) para **aquecer** o backend sem bloquear a UI.

| Opção | Prós | Contras |
|-------|------|---------|
| `--min-instances=0` (como no exemplo acima) | Menor custo quando não há uso | Cold start após cada período “frio” |
| `--min-instances=1` | Elimina na prática o cold start para uso contínuo | Uma instância sempre ativa gera custo mínimo contínuo de CPU/memória |

Para demonstrações ou ambientes com SLA mais rígido, avalie **`--min-instances=1`** no `gcloud run deploy`. Mesmo com `min-instances=0`, o ping em `/api/health` reduz a percepção de lentidão ao primeiro clique.

## 8. Custo

- `db-f1-micro` + disco 10 GB + Cloud Run com min 0 é o desenho mais barato para testes.
- Monitore **Billing → Budgets** e desligue a instância SQL quando não usar (`gcloud sql instances patch ... --activation-policy=NEVER`).