# Use admin token to get client ID, then agent token to PATCH
$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk0ZGYyNDYzLTQxMWEtNGQ5Zi04MTE3LWFkMjA4NTMyZDUwYyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJpc0FkbWluIjp0cnVlLCJpc1N1cGVyQWRtaW4iOnRydWUsImlzVHJpYWxVc2VyIjpmYWxzZSwiY29tcGFueUlkIjoiZDk3NDBhNGQtZTIwYy00OTY0LWI4OWItY2IxYWU0MDE1YzkyIiwiaWF0IjoxNzc2MDU2NzkwLCJleHAiOjE3NzY2NjE1OTB9.jqDPwTLdqY0-IcB-Ud_yiW3UXNF_JHiaLJRki38M21w"

# Get another missing client using admin token
$clients = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $adminToken"}
$missing = $clients.clients | Where-Object { $_.latitude -eq $null -and $_.id -ne "706cf7aa-8338-4fe2-a171-3e44362f9b58" }
$clientId2 = $missing[0].id
Write-Host "Testing agent PATCH with client: $clientId2"

# Now get agent token
$agentBody = @{
    email = "agent@test.com"
    password = "password123"
} | ConvertTo-Json

$agentLogin = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" -Method POST -Body $agentBody -ContentType "application/json"
$agentToken = $agentLogin.token
Write-Host "Agent logged in"

# TEST: Agent PATCH location (using /clients route, not /admin/clients)
Write-Host "`nTEST: Agent PATCH /clients/:id/location" -ForegroundColor Yellow
try {
    $patch = Invoke-RestMethod -Uri "http://localhost:5000/clients/$clientId2/location" -Method PATCH -Body '{"latitude":26.1197,"longitude":85.3910,"accuracy":15}' -ContentType "application/json" -Headers @{Authorization="Bearer $agentToken"}
    $patch | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}

# Verify with admin token
Start-Sleep -Seconds 1
Write-Host "`nVerify after agent PATCH (with admin token):" -ForegroundColor Yellow
$v = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $adminToken"}
$saved = $v.clients | Where-Object { $_.id -eq $clientId2 }
Write-Host "lat: $($saved.latitude), lng: $($saved.longitude)"