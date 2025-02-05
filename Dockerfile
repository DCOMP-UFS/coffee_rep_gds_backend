# Dockerfile
FROM openjdk:17-alpine

RUN apk add --no-cache openssl

WORKDIR /app

RUN mkdir -p src/main/resources

RUN openssl genpkey -algorithm RSA -out src/main/resources/app.key -pkeyopt rsa_keygen_bits:2048

RUN openssl rsa -pubout -in src/main/resources/app.key -out src/main/resources/app.pub

RUN chmod 600 src/main/resources/app.key && chmod 644 src/main/resources/app.pub

COPY mvnw mvnw

COPY . .

RUN chmod +x mvnw

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "./mvnw package -Dmaven.test.skip && java -jar target/app.jar"]