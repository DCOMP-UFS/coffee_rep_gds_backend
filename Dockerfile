# Dockerfile
FROM openjdk:17-alpine

RUN apk add --no-cache openssl

RUN apk update && apk add --no-cache bash wget ca-certificates

WORKDIR /app

RUN mkdir -p src/main/resources/key

RUN openssl genpkey -algorithm RSA -out src/main/resources/key/app.key -pkeyopt rsa_keygen_bits:2048

RUN openssl rsa -pubout -in src/main/resources/key/app.key -out src/main/resources/key/app.pub

RUN chmod 600 src/main/resources/key/app.key && chmod 644 src/main/resources/key/app.pub

COPY . .

ENV APP_PROFILE=dev

EXPOSE 8080