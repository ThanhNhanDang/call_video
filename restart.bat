@echo off
echo Dang tat cac port 3001 va 5173...

REM Kill port 3001 (Server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /F /PID %%a 2>nul
)

REM Kill port 5173 (Client)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    taskkill /F /PID %%a 2>nul
)

echo Da tat tat ca cac port!
timeout /t 2 /nobreak >nul

echo Khoi dong Server...
cd /d "%~dp0server"
start "WebRTC Server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo Khoi dong Client...
cd /d "%~dp0client"
start "WebRTC Client" cmd /k "npm run dev"

echo.
echo ========================================
echo Server: http://localhost:3001
echo Client: http://localhost:5173
echo ========================================
