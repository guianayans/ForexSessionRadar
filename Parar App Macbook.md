-- Parar App Macbook --

Use estes comandos no Terminal:

```bash
# 1) ver quem está usando a porta do app
lsof -nP -iTCP:4783 -sTCP:LISTEN

# 2) matar o processo da porta 4783
kill -9 $(lsof -ti tcp:4783)
```

Se também estiver aberto o app Tauri instalado, feche ele junto:

```bash
pkill -f "Forex Session Radar"
pkill -f "forex-backend"
```

Confirme que parou:

```bash
lsof -nP -iTCP:4783 -sTCP:LISTEN
```

Se não retornar nada, não vai mais disparar e-mail duplicado.