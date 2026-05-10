# Coffee Rep GDS Backend

Backend Spring Boot do sistema Coffee Rep GDS.

## Requisitos

- Java 17+
- Docker Desktop

## Fluxo local (Docker apenas para banco)

No fluxo de desenvolvimento local:

- PostgreSQL roda via Docker
- Backend roda manualmente no terminal

## 1) Subir apenas o banco

No diretorio do backend:

```bash
docker compose up -d postgres
docker compose ps
```

Se você já usava o banco antigo (`gds`) e trocou o nome do database, apague o volume local para o Postgres recriar o cluster com o nome novo: `docker compose down -v` (isso apaga os dados do volume `pgdata`).

Banco exposto em `localhost:5433` com:

- Database: `coffee_gds_db`
- Usuario: `postgres`
- Senha: `postgres`

## 2) Gerar chaves JWT (primeira vez)

Se os arquivos `src/main/resources/app.key` e `src/main/resources/app.pub` nao existirem, gere com:

```bash
docker run --rm -v "c:/GitHubCloud/coffee_rep_gds/coffee_rep_gds_backend:/work" -w /work alpine/openssl genpkey -algorithm RSA -out src/main/resources/app.key -pkeyopt rsa_keygen_bits:2048
docker run --rm -v "c:/GitHubCloud/coffee_rep_gds/coffee_rep_gds_backend:/work" -w /work alpine/openssl rsa -pubout -in src/main/resources/app.key -out src/main/resources/app.pub
```

## 3) Rodar o backend manualmente

```bash
./mvnw -Pdev spring-boot:run
```

No Windows PowerShell:

```powershell
.\mvnw.cmd -Pdev spring-boot:run
```

Backend disponivel em:

- `http://localhost:8080`
- `http://localhost:8080/swagger-ui/index.html`

## Parar servicos

- Backend: `Ctrl + C` no terminal
- Banco: `docker compose stop postgres`
