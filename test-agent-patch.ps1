# Test agent PATCH after fix - more verbose
$agentBody = @{
    email = "agent@test.com"
    password = "password123"
} | ConvertTo-Json

try {
    $agentLogin = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" -Method POST -Body $agentBody -ContentType "application/json" -ErrorAction Stop
    $agentToken = $agentLogin.token
    Write-Host "Agent token: SUCCESS"
} catch {
    Write-Host "Login error: $_"
    exit
}

$clientId = "4805b361-7ab2-41a0-a338-f879af19a20b"

try {
    $patch = Invoke-RestMethod -Uri "http://localhost:5000/clients/$clientId/location" -Method PATCH -Body '{"latitude":26.1197,"longitude":85.3910,"accuracy":15}' -ContentType "application/json" -Headers @{Authorization="Bearer $agentToken"} -ErrorAction Stop
    $patch | ConvertTo-Json -Depth 3
} catch {
    Write-Host "PATCH Error: $($_.Exception.Message)"
    $_.Exception.Response | Get-Member
}