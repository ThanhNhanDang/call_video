@echo off
echo ========================================
echo Kiem tra ung dung dang su dung Camera
echo ========================================
echo.

REM List all processes that might be using camera
echo Cac ung dung co the dang su dung camera:
echo.

tasklist | findstr /i "teams zoom skype discord obs chrome msedge firefox"

echo.
echo ========================================
echo Neu thay ung dung nao tren, hay tat no di
echo Hoac restart may tinh de giai phong camera
echo ========================================
pause
