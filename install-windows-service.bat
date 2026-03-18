@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "SERVICE_NAME=ForexRadar"
set "APP_DIR=%CD%"
set "DATA_DIR=%APP_DIR%\data"
set "LOG_DIR=%APP_DIR%\logs"
set "PORT=3080"
set "PUBLIC_URL=http://yanserver.ddns.net:%PORT%"

echo.
echo =========================================
echo  Forex Session Radar - Windows Installer
echo =========================================
echo App dir: %APP_DIR%
echo Service: %SERVICE_NAME%
echo Port:    %PORT%
echo.

:: Require admin privileges for service/firewall operations
net session >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Execute este BAT como Administrador.
  pause
  exit /b 1
)

call :ensure_node20
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [1/6] Instalando dependencias (workspaces)...
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo [ERRO] npm ci falhou.
  pause
  exit /b 1
)

echo [2/6] Gerando frontend...
call npm run build:frontend
if errorlevel 1 (
  echo [ERRO] build do frontend falhou.
  pause
  exit /b 1
)

set "NSSM_ROOT=%APP_DIR%\tools\nssm"
set "NSSM_EXE=%NSSM_ROOT%\win64\nssm.exe"

if not exist "%NSSM_EXE%" (
  echo [3/6] Baixando NSSM...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "$zip='%APP_DIR:\=\\%\\tools\\nssm.zip';" ^
    "$dir='%APP_DIR:\=\\%\\tools';" ^
    "$null = New-Item -ItemType Directory -Force -Path $dir;" ^
    "Invoke-WebRequest -UseBasicParsing -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $zip;" ^
    "Expand-Archive -Path $zip -DestinationPath $dir -Force;" ^
    "if (Test-Path '%APP_DIR:\=\\%\\tools\\nssm') { Remove-Item -Recurse -Force '%APP_DIR:\=\\%\\tools\\nssm' };" ^
    "Move-Item -Path '%APP_DIR:\=\\%\\tools\\nssm-2.24' -Destination '%APP_DIR:\=\\%\\tools\\nssm';" ^
    "Remove-Item -Force $zip;"
  if errorlevel 1 (
    echo [ERRO] Falha ao baixar/extrair NSSM.
    pause
    exit /b 1
  )
)

if not exist "%NSSM_EXE%" (
  echo [ERRO] NSSM nao encontrado em "%NSSM_EXE%".
  pause
  exit /b 1
)

for /f "delims=" %%p in ('where node') do (
  if not defined NODE_EXE set "NODE_EXE=%%p"
)

if not defined NODE_EXE (
  echo [ERRO] Nao foi possivel resolver o executavel do Node.js.
  pause
  exit /b 1
)

set "SERVER_JS=%APP_DIR%\backend\src\server.js"
if not exist "%SERVER_JS%" (
  echo [ERRO] Arquivo nao encontrado: %SERVER_JS%
  pause
  exit /b 1
)

echo [4/6] Registrando servico Windows...
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorlevel%==0 (
  "%NSSM_EXE%" stop "%SERVICE_NAME%" >nul 2>&1
  "%NSSM_EXE%" remove "%SERVICE_NAME%" confirm >nul 2>&1
  timeout /t 2 >nul
)

"%NSSM_EXE%" install "%SERVICE_NAME%" "%NODE_EXE%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%APP_DIR%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppParameters "\"%SERVER_JS%\" --host 0.0.0.0 --port %PORT% --data-dir \"%DATA_DIR%\""
"%NSSM_EXE%" set "%SERVICE_NAME%" AppEnvironmentExtra ^
  "NODE_ENV=production" ^
  "FOREX_ENV_FILE=%DATA_DIR%\backend.env" ^
  "APP_PUBLIC_URL=%PUBLIC_URL%" ^
  "EMAIL_CTA_URL=%PUBLIC_URL%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStdout "%LOG_DIR%\service.out.log"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStderr "%LOG_DIR%\service.err.log"
"%NSSM_EXE%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START

echo [5/6] Liberando firewall (porta %PORT%)...
netsh advfirewall firewall add rule name="ForexRadar %PORT%" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1

echo [6/6] Iniciando servico...
"%NSSM_EXE%" start "%SERVICE_NAME%"
if errorlevel 1 (
  echo [ERRO] Falha ao iniciar o servico. Verifique logs em "%LOG_DIR%".
  pause
  exit /b 1
)

echo.
echo Instalacao concluida.
echo URL local:   http://127.0.0.1:%PORT%
echo URL publica: %PUBLIC_URL%
echo Logs:        %LOG_DIR%
echo.
echo O servico inicia automaticamente com o Windows.
echo.
start "" "http://127.0.0.1:%PORT%"
pause
exit /b 0

:ensure_node20
set "NEED_NODE_INSTALL=0"
set "NODE_VERSION="
set "NODE_MAJOR=0"

where node >nul 2>&1
if errorlevel 1 (
  set "NEED_NODE_INSTALL=1"
) else (
  for /f "delims=" %%v in ('node -p "process.versions.node"') do set "NODE_VERSION=%%v"
  for /f "tokens=1 delims=." %%m in ("%NODE_VERSION%") do set "NODE_MAJOR=%%m"
  if %NODE_MAJOR% LSS 20 set "NEED_NODE_INSTALL=1"
)

if "%NEED_NODE_INSTALL%"=="1" (
  echo [INFO] Node.js 20+ nao encontrado. Instalando automaticamente...
  call :install_node20
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar Node.js 20 automaticamente.
    exit /b 1
  )
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH apos instalacao.
  exit /b 1
)

for /f "delims=" %%v in ('node -p "process.versions.node"') do set "NODE_VERSION=%%v"
for /f "tokens=1 delims=." %%m in ("%NODE_VERSION%") do set "NODE_MAJOR=%%m"
if %NODE_MAJOR% LSS 20 (
  echo [ERRO] Node.js %NODE_VERSION% detectado. Necessario Node.js 20+.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao encontrado no PATH.
  exit /b 1
)

echo [OK] Node.js %NODE_VERSION% pronto.
exit /b 0

:install_node20
set "WINGET_OK=0"

where winget >nul 2>&1
if not errorlevel 1 (
  echo [INFO] Tentando instalar Node.js LTS via winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements >nul 2>&1
  if not errorlevel 1 set "WINGET_OK=1"
)

if "%WINGET_OK%"=="1" (
  echo [OK] Node.js instalado via winget.
  exit /b 0
)

echo [INFO] Winget indisponivel/falhou. Tentando instalacao silenciosa via MSI...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$msi=[IO.Path]::Combine($env:TEMP,'node-v20-lts-x64.msi');" ^
  "$release=(Invoke-RestMethod -UseBasicParsing 'https://nodejs.org/dist/index.json' | Where-Object { $_.version -like 'v20.*' } | Select-Object -First 1).version;" ^
  "if(-not $release){ throw 'Nao foi possivel resolver versao Node.js v20'; }" ^
  "$plain=$release.TrimStart('v');" ^
  "$url='https://nodejs.org/dist/' + $release + '/node-' + $plain + '-x64.msi';" ^
  "Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $msi;" ^
  "$p=Start-Process -FilePath msiexec.exe -ArgumentList '/i', $msi, '/qn', '/norestart' -Wait -PassThru;" ^
  "if($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010){ throw ('msiexec falhou com codigo ' + $p.ExitCode); }" ^
  "Remove-Item -Force $msi -ErrorAction SilentlyContinue;"

if errorlevel 1 (
  echo [ERRO] Falha na instalacao MSI do Node.js.
  exit /b 1
)

echo [OK] Node.js instalado via MSI.
exit /b 0
