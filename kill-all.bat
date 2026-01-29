@echo off
echo Dang tat tat ca Node.js processes...

taskkill /F /IM node.exe 2>nul

if %errorlevel% equ 0 (
    echo Da tat tat ca Node.js processes!
) else (
    echo Khong tim thay Node.js process nao dang chay.
)

timeout /t 2 /nobreak >nul
