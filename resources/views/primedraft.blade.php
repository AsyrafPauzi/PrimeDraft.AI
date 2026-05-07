<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PrimeDraft.AI</title>
    <link rel="icon" type="image/svg+xml" href="/brand/primedraft-favicon.svg">
    <link rel="apple-touch-icon" href="/brand/primedraft-favicon.svg">
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @endif
</head>
<body>
    <div id="app"></div>
</body>
</html>
