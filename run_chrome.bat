@echo off
start "Chrome" /B "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --no-sandbox --enable-logging --v=1 http://localhost:5174/ > chrome_output.txt 2>&1
ping 127.0.0.1 -n 6 > nul
taskkill /IM chrome.exe /F > nul
