$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk0ZGYyNDYzLTQxMWEtNGQ5Zi04MTE3LWFkMjA4NTMyZDUwYyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJpc0FkbWluIjp0cnVlLCJpc1N1cGVyQWRtaW4iOnRydWUsImlzVHJpYWxVc2VyIjpmYWxzZSwiY29tcGFueUlkIjoiZDk3NDBhNGQtZTIwYy00OTY0LWI4OWItY2IxYWU0MDE1YzkyIiwiaWF0IjoxNzc2MDU2NzkwLCJleHAiOjE3NzY2NjE1OTB9.jqDPwTLdqY0-IcB-Ud_yiW3UXNF_JHiaLJRki38M21w"

Write-Host "TEST: Check location logs" -ForegroundColor Yellow
$logs = Invoke-RestMethod -Uri "http://localhost:5000/admin/location-logs/all" -Method GET -Headers @{Authorization="Bearer $adminToken"}
Write-Host "Location logs count: $($logs.logs.Count)"
if ($logs.logs.Count -gt 0) {
    $logs.logs[0] | Select-Object id,latitude,longitude,user_id | ConvertTo-Json -Depth 3
}

Write-Host "`nTEST: Self-Heal (quick timeout test)" -ForegroundColor Yellow
try {
    # Set timeout via -TimeoutSec
    $heal = Invoke-RestMethod -Uri "http://localhost:5000/admin/self-heal-clients" -Method POST -Body "" -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -TimeoutSec 10
    $heal | ConvertTo-Json
} catch {
    Write-Host "ERROR/TIMEOUT: $($_.Exception.Message)"
    Write-Host "Self-heal likely running for all clients - checking results manually"
}