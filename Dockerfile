# Dockerfile
FROM openjdk:17-alpine

RUN apk add --no-cache openssl

WORKDIR /app

RUN mkdir -p src/main/resources/key

RUN openssl genpkey -algorithm RSA -out src/main/resources/key/app.key -pkeyopt rsa_keygen_bits:2048
#RUN openssl genrsa > ./coffee_rep_gds_backend/src/main/resources/app.key

RUN openssl rsa -pubout -in src/main/resources/key/app.key -out src/main/resources/key/app.pub
#RUN openssl rsa -in private.pem -pubout -out ./coffee_rep_gds_backend/src/main/resources/public.pem

RUN chmod 600 src/main/resources/key/app.key && chmod 644 src/main/resources/key/app.pub

COPY . .

ENV APP_PROFILE=dev

ENV DB_URL=jdbc:postgresql://gds_database:5432/gds

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "target/coffee_rep_gds_backend-0.0.1-SNAPSHOT.jar"]