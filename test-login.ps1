$body = @{
    email = "admin@kindacare.com"
    password = "admin123"
} | ConvertTo-Json

$r = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" -Method POST -Body $body -ContentType "application/json"
$r | ConvertTo-Json -Depth 10