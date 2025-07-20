#!/bin/bash

# Nome do seu pom.xml
POM_FILE="pom.xml"

# Verifica se o pom.xml existe
if [ ! -f "$POM_FILE" ]; then
  echo "Arquivo pom.xml não encontrado!"
  exit 1
fi

# Faz backup do pom.xml
cp "$POM_FILE" "$POM_FILE.bak"

# Altera o packaging de jar para war
echo "Alterando packaging para WAR..."
sed -i 's/<packaging>jar<\/packaging>/<packaging>war<\/packaging>/g' "$POM_FILE"

# Executa o build com perfil prod
echo "Executando build com perfil prod..."
mvn clean package -Pprod -DDB_URL=jdbc:postgresql://localhost:5433/gds -DDB_USERNAME=postgres -DDB_PASSWORD=postgres -DADMIN_CPF=17055661030 -DADMIN_PASSWORD=1234 -DAPP_PROFILE=prod

# Restaura o pom.xml original
echo "Restaurando pom.xml original..."
mv "$POM_FILE.bak" "$POM_FILE"

echo "Build finalizado. pom.xml restaurado."
