# 매일 아침 8시에 신문을 새로 발행하도록 Windows 작업 스케줄러에 등록합니다.
# 컴퓨터가 8시에 꺼져 있었다면, 켜진 뒤 바로 발행합니다.
# 해제하려면:  Unregister-ScheduledTask -TaskName "NewsApp-MorningEdition" -Confirm:$false

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonw = (Get-Command pythonw -ErrorAction Stop).Source

$action   = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$dir\fetch_news.py`"" -WorkingDirectory $dir
$trigger  = New-ScheduledTaskTrigger -Daily -At "08:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName "NewsApp-MorningEdition" -Description "아침신보: 매일 오전 8시 뉴스 갱신" `
    -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "등록 완료: 매일 오전 8시에 뉴스가 갱신됩니다."
