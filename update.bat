@echo off
cd /d "%~dp0"

REM Stage all changes
git add -A

REM Commit with an automatic message (timestamp)
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
    set today=%%c-%%a-%%b
)
for /f "tokens=1-2 delims=: " %%a in ("%time%") do (
    set now=%%a-%%b
)

git commit -m "Auto update %today% %now%"

REM Push to the current branch
git push

echo.
echo Done!
pause
