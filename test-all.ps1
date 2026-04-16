# Test Script - Run all 4 tests
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk0ZGYyNDYzLTQxMWEtNGQ5Zi04MTE3LWFkMjA4NTMyZDUwYyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJpc0FkbWluIjp0cnVlLCJpc1N1cGVyQWRtaW4iOnRydWUsImlzVHJpYWxVc2VyIjpmYWxzZSwiY29tcGFueUlkIjoiZDk3NDBhNGQtZTIwYy00OTY0LWI4OWItY2IxYWU0MDE1YzkyIiwiaWF0IjoxNzc2MDU2NzkwLCJleHAiOjE3NzY2NjE1OTB9.jqDPwTLdqY0-IcB-Ud_yiW3UXNF_JHiaLJRki38M21w"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST 1: Self-Heal Clients" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
$heal = Invoke-RestMethod -Uri "http://localhost:5000/admin/self-heal-clients" -Method POST -Body "" -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
Write-Host ($heal | ConvertTo-Json -Depth 10)

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST 2: Get Missing Clients" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
$clients = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $token"}

# Find clients missing coordinates
$missing = $clients.clients | Where-Object { $_.latitude -eq $null -or $_.latitude -eq 0 }
Write-Host "Missing clients count: $($missing.Count)"
Write-Host "First missing client:"
$missing[0] | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST 3: Admin PATCH location" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
if ($missing.Count -gt 0) {
    $clientId = $missing[0].id
    Write-Host "Testing with client: $clientId"

    $patch = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients/$clientId/location" -Method PATCH -Body '{"latitude":19.0760,"longitude":72.8777,"accuracy":10}' -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
    Write-Host ($patch | ConvertTo-Json)

    # Verify saved
    $verified = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $token"}
    $saved = $verified.clients | Where-Object { $_.id -eq $clientId }
    Write-Host "Verify after PATCH - lat: $($saved.latitude), lng: $($saved.longitude)"
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST 4: Check location_logs" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
$logs = Invoke-RestMethod -Uri "http://localhost:5000/admin/location-logs/all" -Method GET -Headers @{Authorization="Bearer $token"}
Write-Host "Location logs count: $($logs.logs.Count)"
if ($logs.logs.Count -gt 0) {
    Write-Host "Latest log:"
    $logs.logs[0] | ConvertTo-Json -Depth 5
}