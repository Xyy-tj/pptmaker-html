@echo off
chcp 65001 >nul
title PPTMaker Build Script

:: Check for Administrator privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo.
    echo [Info] Requesting Administrator privileges to handle build dependencies...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo [Info] Trying to elevate privileges using PowerShell...
    powershell -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', '\"\"%~f0\"\"' -Verb RunAs"
    if %errorlevel% neq 0 (
        echo [Error] Failed to request Administrator privileges.
        echo Please right-click this file and select "Run as administrator".
        pause
    )
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

echo ==========================================
echo      OpenClaw Intro - Build Process
echo ==========================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

if not exist "package.json" (
    echo [Error] package.json not found!
    pause
    exit /b
)

echo.
echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [Error] Failed to install dependencies.
    pause
    exit /b
)

echo.
echo [2/3] Building executable (Attempting with simplified signing config)...
:: Set environment variable to skip strict code signing checks if possible
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist
if %errorlevel% neq 0 (
    echo.
    echo [Error] Build failed.
    echo [Tip] If you see "Cannot create symbolic link" errors, please ensure you approved the Administrator request.
    echo.
    pause
    exit /b
)

echo.
echo [3/3] Build complete! Opening output folder...
start "" "dist"

echo.
echo You can find the executable in the 'dist' folder.
pause
