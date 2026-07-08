@echo off
title Rubik's Cube Solver Launcher
echo ============================================================
echo          Starting Rubik's Cube Solver Application...
echo ============================================================

:: 1. Start Python Backend in a separate command window
echo [1/3] Launching Backend Flask API Server...
start "Cube Solver Backend" cmd /k "cd backend && ..\venv\Scripts\python.exe server.py"

:: 2. Wait a moment for backend startup
timeout /t 2 /nobreak > nul

:: 3. Open browser at frontend address
echo [2/3] Opening Web Browser...
start https://localhost:5173/

:: 4. Start Vite Frontend in this command window
echo [3/3] Starting Frontend Dev Server...
cd frontend
npm run dev
