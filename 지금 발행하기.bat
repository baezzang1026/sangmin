@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 뉴스를 모으는 중입니다...
python fetch_news.py
start "" "%~dp0index.html"
