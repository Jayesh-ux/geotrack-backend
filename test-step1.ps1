$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk0ZGYyNDYzLTQxMWEtNGQ5Zi04MTE3LWFkMjA4NTMyZDUwYyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJpc0FkbWluIjp0cnVlLCJpc1N1cGVyQWRtaW4iOnRydWUsImlzVHJpYWxVc2VyIjpmYWxzZSwiY29tcGFueUlkIjoiZDk3NDBhNGQtZTIwYy00OTY0LWI4OWItY2IxYWU0MDE1YzkyIiwiaWF0IjoxNzc2MDU2NzkwLCJleHAiOjE3NzY2NjE1OTB9.jqDPwTLdqY0-IcB-Ud_yiW3UXNF_JHiaLJRki38M21w"

Write-Host "TEST: Get Missing Clients" -ForegroundColor Yellow
$clients = Invoke-RestMethod -Uri "http://localhost:5000/admin/clients" -Method GET -Headers @{Authorization="Bearer $token"}

$missing = $clients.clients | Where-Object { $_.latitude -eq $null }
Write-Host "Missing: $($missing.Count)"
$missing[0] | Select-Object id,name,address,latitude,longitude | ConvertTo-Json