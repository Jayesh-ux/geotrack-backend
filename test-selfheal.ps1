$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk0ZGYyNDYzLTQxMWEtNGQ5Zi04MTE3LWFkMjA4NTMyZDUwYyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJpc0FkbWluIjp0cnVlLCJpc1N1cGVyQWRtaW4iOnRydWUsImlzVHJpYWxVc2VyIjpmYWxzZSwiY29tcGFueUlkIjoiZDk3NDBhNGQtZTIwYy00OTY0LWI4OWItY2IxYWU0MDE1YzkyIiwiaWF0IjoxNzc2MDU2NzkwLCJleHAiOjE3NzY2NjE1OTB9.jqDPwTLdqY0-IcB-Ud_yiW3UXNF_JHiaLJRki38M21w"

$start = Get-Date
Write-Host "Starting Self-Heal at: $start"
Write-Host "Testing Self-Heal (batched)..."

try {
    $heal = Invoke-RestMethod -Uri "http://localhost:5000/admin/self-heal-clients" -Method POST -Body "" -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -TimeoutSec 120 -ErrorAction Stop
    $heal | ConvertTo-Json -Depth 5
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Server still running old code - checking results manually"
}

$end = Get-Date
$duration = ($end - $start).TotalSeconds
Write-Host "Duration: $duration seconds"

# Check current missing count
$clients = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $adminToken"} -ErrorAction Stop
$stillMissing = ($clients.clients | Where-Object { $_.latitude -eq $null }).Count
Write-Host "Still missing after fix: $stillMissing clients (was 254)"