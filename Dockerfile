# Dockerfile
FROM openjdk:17-alpine

RUN apk add --no-cache openssl

WORKDIR /app

RUN mkdir -p src/main/resources/key

RUN openssl genpkey -algorithm RSA -out src/main/resources/key/app.key -pkeyopt rsa_keygen_bits:2048

RUN openssl rsa -pubout -in src/main/resources/key/app.key -out src/main/resources/key/app.pub

RUN chmod 600 src/main/resources/key/app.key && chmod 644 src/main/resources/key/app.pub

COPY . .

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "./mvnw clean package && java -jar target/app.jar"]