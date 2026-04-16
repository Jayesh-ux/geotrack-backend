# Sign up a new admin user to get token
$body = @{
    email = "testadmin@kindacare.com"
    password = "test123456"
    fullName = "Test Admin"
    department = "Testing"
    isAdmin = $true
} | ConvertTo-Json

$r = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" -Method POST -Body $body -ContentType "application/json"
$r | ConvertTo-Json -Depth 10