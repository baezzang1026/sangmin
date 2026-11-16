# 朝刊新報 · 아침신보

옛날 신문 모양으로 오늘의 국내·해외 주요 뉴스를 보여주는 웹앱입니다.

## 보기
`index.html` 을 더블클릭하면 브라우저에서 열립니다. (서버 필요 없음)

## 갱신
- Windows 작업 스케줄러 작업 **NewsApp-MorningEdition** 이 매일 오전 8시에 `fetch_news.py` 를 실행합니다.
- 8시에 컴퓨터가 꺼져 있었다면 켜진 뒤 바로 실행됩니다.
- 지금 바로 새로 받으려면 `지금 발행하기.bat` 을 실행하세요.
- 페이지를 열어둔 채로 8시가 지나면 자동으로 새 호를 다시 불러옵니다.
- 수집 기록: `data/fetch.log`

## 기사 선정
- **국내 (7건)**: 구글 뉴스 한국판 '주요 뉴스' 순위 상위 기사. 연합뉴스·조선·동아·한겨레·경향 RSS에서 같은 기사를 찾으면 요약과 사진을 붙입니다.
- **해외 (6건)**: BBC, New York Times, The Guardian, Al Jazeera 의 국제면 상위 기사 (원문 영어).
- 개수와 언론사는 `fetch_news.py` 위쪽 설정에서 바꿀 수 있습니다.

## 스케줄 다시 등록 / 해제
```powershell
powershell -ExecutionPolicy Bypass -File install_schedule.ps1
Unregister-ScheduledTask -TaskName "NewsApp-MorningEdition" -Confirm:$false
```
