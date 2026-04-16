$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk0ZGYyNDYzLTQxMWEtNGQ5Zi04MTE3LWFkMjA4NTMyZDUwYyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJpc0FkbWluIjp0cnVlLCJpc1N1cGVyQWRtaW4iOnRydWUsImlzVHJpYWxVc2VyIjpmYWxzZSwiY29tcGFueUlkIjoiZDk3NDBhNGQtZTIwYy00OTY0LWI4OWItY2IxYWU0MDE1YzkyIiwiaWF0IjoxNzc2MDU2NzkwLCJleHAiOjE3NzY2NjE1OTB9.jqDPwTLdqY0-IcB-Ud_yiW3UXNF_JHiaLJRki38M21w"
$clientId = "706cf7aa-8338-4fe2-a171-3e44362f9b58"

Write-Host "TEST: Admin PATCH location" -ForegroundColor Yellow
try {
    $patch = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients/$clientId/location" -Method PATCH -Body '{"latitude":19.0760,"longitude":72.8777,"accuracy":10}' -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
    $patch | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Response)"
}

# Verify
Start-Sleep -Seconds 1
Write-Host "`nVerify after PATCH:" -ForegroundColor Yellow
$v = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $token"}
$saved = $v.clients | Where-Object { $_.id -eq $clientId }
Write-Host "lat: $($saved.latitude), lng: $($saved.longitude)"