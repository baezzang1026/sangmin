# 건국일보 자동 설정 (Windows 작업 스케줄러)
#  1) NewsApp-MorningEdition : 매일 오전 8시 뉴스 갱신 (8시에 PC가 꺼져 있었다면 켜진 뒤 바로)
#  2) NewsApp-LocalServer    : 로그인할 때 http://localhost:8282 로컬 서버 시작
# 해제하려면:
#   Unregister-ScheduledTask -TaskName "NewsApp-MorningEdition" -Confirm:$false
#   Unregister-ScheduledTask -TaskName "NewsApp-LocalServer" -Confirm:$false

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonw = (Get-Command pythonw -ErrorAction Stop).Source

# 1) 아침 8시 발행
$action   = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$dir\fetch_news.py`"" -WorkingDirectory $dir
$trigger  = New-ScheduledTaskTrigger -Daily -At "08:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "NewsApp-MorningEdition" -Description "건국일보: 매일 오전 8시 뉴스 갱신" `
    -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

# 2) 로컬 서버 (이 PC에서만 접속 가능)
$action   = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$dir\serve.py`"" -WorkingDirectory $dir
$trigger  = New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "NewsApp-LocalServer" -Description "건국일보: http://localhost:8282 로컬 서버" `
    -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName "NewsApp-LocalServer"

Write-Host "등록 완료: 매일 오전 8시 갱신, 주소 http://localhost:8282"
