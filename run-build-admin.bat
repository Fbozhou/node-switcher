@echo off
:: 替换下面路径为你的 electron 项目路径
set NODE_ENV=production
set PROJECT_PATH=D:\Documents\1\MyServer\node-switcher

:: 启动 Electron（管理员权限）
powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %PROJECT_PATH% && npm run build' -Verb RunAs"
