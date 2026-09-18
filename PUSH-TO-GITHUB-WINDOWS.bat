@echo off
setlocal
REM Launches the accompanying local PowerShell publisher. No keys or passwords are stored in either file.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUSH-TO-GITHUB-WINDOWS.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo The publisher stopped. Read the red message above, then send a screenshot if you need help.
pause
exit /b %RESULT%
