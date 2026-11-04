@echo off
title Smart Green Building Local Server
echo ==========================================================
echo Starting local web server on http://localhost:8080 ...
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 8080; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:' + $port + '/'); $listener.Start(); Write-Host 'Server running at http://localhost:8080/'; Start-Process 'http://localhost:8080/'; while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $path = '.' + $request.Url.LocalPath; if ($path -eq './') { $path = './index.html' }; if (Test-Path $path) { $bytes = [System.IO.File]::ReadAllBytes($path); $ext = [System.IO.Path]::GetExtension($path); switch ($ext) { '.html' { $response.ContentType = 'text/html' } '.css' { $response.ContentType = 'text/css' } '.js' { $response.ContentType = 'application/javascript' } '.json' { $response.ContentType = 'application/json' } default { $response.ContentType = 'application/octet-stream' } }; $response.ContentLength64 = $bytes.Length; $response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $response.StatusCode = 404 }; $response.Close() }"

