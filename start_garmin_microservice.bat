@echo off
cd SparkyFitnessGarmin
"C:\Users\chand.DESKTOP-JSMEV9D\AppData\Roaming\Python\Python313\Scripts\uvicorn.exe" main:app --host 0.0.0.0 --port 8000 --reload
pause