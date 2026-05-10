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
- `CORS_ORIGINS` = URL(s) do frontend em produção (ex.: `https://seu-app.web.app`)

## 5. Chaves JWT (Secret Manager)

O `Dockerfile.cloudrun` **não** inclui `app.key` / `app.pub`. Monte como arquivos e aponte:

```bash
# Na sua máquina (onde já existem app.key e app.pub):
gcloud secrets create jwt-private --data-file=src/main/resources/app.key --project=plated-shelter-495618-d9
gcloud secrets create jwt-public  --data-file=src/main/resources/app.pub --project=plated-shelter-495618-d9

# Permissão para a SA de runtime do Cloud Run ler segredos (use a mesma RUN_SA da seção 2):
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

No deploy do Cloud Run, monte volumes de segredo e defina:

- `JWT_PRIVATE_KEY=file:/secrets/app.key`
- `JWT_PUBLIC_KEY=file:/secrets/app.pub`

Exemplo de flags (ajuste nomes de segredo e caminhos):

```text
--set-secrets=/secrets/app.key=jwt-private:latest,/secrets/app.pub=jwt-public:latest
--set-env-vars=JWT_PRIVATE_KEY=file:/secrets/app.key,JWT_PUBLIC_KEY=file:/secrets/app.pub
```

## 6. Artifact Registry + Cloud Build

```bash
export REGION=us-central1
export REPO=coffee-rep

gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Coffee Rep"

# Build, push e deploy (executar na pasta coffee_rep_gds_backend)
# Ajuste substituições; use a SA coffee-rep-cloud-build como executora do build.
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=${REGION},_REPO_NAME=${REPO},_IMAGE_NAME=coffee-rep-api,_TAG=v1 .
```

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
  --set-env-vars="SPRING_PROFILES_ACTIVE=prod,APP_PROFILE=prod,DB_URL=${DB_URL},DB_USERNAME=coffee_gds_app,ADMIN_CPF=SEU_CPF,ADMIN_PASSWORD=SUA_SENHA_ADMIN,CORS_ORIGINS=https://seu-frontend.example.com,JWT_PRIVATE_KEY=file:/secrets/app.key,JWT_PUBLIC_KEY=file:/secrets/app.pub" \
  --set-secrets="DB_PASSWORD=coffee-gds-app-password:latest,/secrets/app.key=jwt-private:latest,/secrets/app.pub=jwt-public:latest"
```

- **`DB_PASSWORD=coffee-gds-app-password:latest`** expõe o conteúdo do segredo como variável de ambiente `DB_PASSWORD` (o Spring lê em `application-prod.properties`).
- Os outros **`--set-secrets`** montam os arquivos PEM das chaves JWT.

A URL do serviço aparece no final do comando. Use `https://.../api/...` no `environment.prod.ts` do Angular.

## 8. Custo

- `db-f1-micro` + disco 10 GB + Cloud Run com min 0 é o desenho mais barato para testes.
- Monitore **Billing → Budgets** e desligue a instância SQL quando não usar (`gcloud sql instances patch ... --activation-policy=NEVER`).
