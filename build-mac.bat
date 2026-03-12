@echo off
chcp 65001 >nul
title PPTMaker Mac Build Script

echo ==========================================
echo      PPTMaker - Mac Build Process
echo ==========================================
echo.
echo [WARNING] Building macOS .dmg files on Windows is generally NOT supported.
echo This script will attempt to run the build, but it may fail or produce an invalid package
echo unless you are using a compatible environment or specific electron-builder configuration.
echo For best results, run this build command on a macOS machine.
echo.
pause

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo.
echo [1/2] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [Error] Failed to install dependencies.
    pause
    exit /b
)

echo.
echo [2/2] Building macOS package (dmg)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist:mac
if %errorlevel% neq 0 (
    echo.
    echo [Error] Build failed.
    echo Note: Building for macOS on Windows has significant limitations.
    echo.
    pause
    exit /b
)

echo.
echo [Success] Build complete! Opening dist folder...
start "" "dist"
pause
