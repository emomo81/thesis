@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
    python launch.py
) else (
    py -3.11 --version >nul 2>nul
    if errorlevel 1 (
        py -3.12 launch.py
    ) else (
        py -3.11 launch.py
    )
)
if errorlevel 1 pause
