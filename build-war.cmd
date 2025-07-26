@echo off
setlocal

set POM_FILE=pom.xml
set BACKUP_FILE=pom_backup.xml

if not exist "%POM_FILE%" (
    echo Arquivo %POM_FILE% nao encontrado!
    exit /b 1
)

echo Fazendo backup do pom.xml...
copy /Y "%POM_FILE%" "%BACKUP_FILE%" >nul

echo Alterando packaging para WAR...
powershell -Command "(Get-Content %POM_FILE%) -replace '<packaging>jar</packaging>', '<packaging>war</packaging>' | Set-Content %POM_FILE%"

echo Executando build com perfil prod...
mvn clean package -Dmaven.test.skip -Pprod -DDB_URL=jdbc:postgresql://localhost:5433/gds -DDB_USERNAME=postgres -DDB_PASSWORD=postgres -DADMIN_CPF=17055661030 -DADMIN_PASSWORD=1234 -DAPP_PROFILE=prod

echo Restaurando pom.xml original...
move /Y "%BACKUP_FILE%" "%POM_FILE%" >nul

echo Build finalizado. pom.xml restaurado.
endlocal