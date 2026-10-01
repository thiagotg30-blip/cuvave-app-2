@echo off
cd /d "%~dp0"
call setup.bat
if errorlevel 1 ( pause & exit /b 1 )
".venv\Scripts\python.exe" -m pip install pyinstaller
if errorlevel 1 ( echo ERRO ao instalar o PyInstaller. & pause & exit /b 1 )
".venv\Scripts\python.exe" -m PyInstaller --noconfirm --windowed --name CubeBabyStudio main.py
if errorlevel 1 ( echo ERRO ao gerar o exe. & pause & exit /b 1 )
echo.
echo Pronto: dist\CubeBabyStudio\CubeBabyStudio.exe
pause
