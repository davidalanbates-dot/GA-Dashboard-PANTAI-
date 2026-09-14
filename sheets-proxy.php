<?php
// Reads the Pantai dashboard's Google Sheet through a restricted service
// account and returns each tab's rows as JSON, so the Sheet itself no
// longer needs to be shared "Anyone with the link" — only the service
// account (and whichever humans edit it monthly) can open it.
//
// IMPORTANT: the service-account JSON key lives in a "fetch" folder
// somewhere near this file — see FETCH_DIR_CANDIDATES below for exactly
// where this script looks. Wherever it ends up, that folder MUST also
// carry the .htaccess file (see fetch/.htaccess in this repo) that
// blocks direct web requests to it — otherwise anything inside
// public_html is potentially reachable by URL, key file included.
// Never upload the key itself into the same folder as this file.

header('Content-Type: application/json');

// Every "fetch" folder location this project has tried, so a future
// re-upload into any of these spots keeps working without another
// round of debugging.
define('FETCH_DIR_CANDIDATES', [
    __DIR__ . '/fetch',          // dashboards.fishermen-analytics.com/fetch (same folder as this script)
    __DIR__ . '/../fetch',       // public_html/fetch
    __DIR__ . '/../../fetch',    // account root/fetch
    __DIR__ . '/../etc/fetch',   // public_html/etc/fetch
    __DIR__ . '/../../etc/fetch',// account root/etc/fetch
]);

// Looks in each candidate folder for the key. Matches the exact expected
// filename first; falls back to "whatever .json file is in there" so a
// slightly different filename (e.g. the original downloaded name) still
// works.
function resolveKeyPath() {
    $checked = [];
    foreach (FETCH_DIR_CANDIDATES as $dir) {
        $exact = $dir . '/service-account.json';
        $checked[] = $exact;
        if (file_exists($exact)) return [$exact, $checked];

        $jsonFiles = @glob($dir . '/*.json');
        if ($jsonFiles) return [$jsonFiles[0], $checked];
    }
    return [null, $checked];
}

define('SHEET_ID', '12fmna96dAMXd7Jmk5B4g-XWM6ZAtIGoxlRnqtkhcm-s');

define('TABS', [
    'Overview', 'Channels', 'AITraffic', 'AISources', 'AICitations',
    'Organic', 'Keywords', 'Conversions', 'Purchases', 'Competitors',
]);

function base64url($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function getAccessToken($key) {
    $header = base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $now = time();
    $claims = base64url(json_encode([
        'iss' => $key['client_email'],
        'scope' => 'https://www.googleapis.com/auth/spreadsheets.readonly',
        'aud' => $key['token_uri'],
        'iat' => $now,
        'exp' => $now + 3600,
    ]));
    $unsigned = "$header.$claims";
    $signature = '';
    if (!openssl_sign($unsigned, $signature, $key['private_key'], 'sha256WithRSAEncryption')) {
        return null;
    }
    $jwt = "$unsigned." . base64url($signature);

    $ch = curl_init($key['token_uri']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($resp, true);
    return $data['access_token'] ?? null;
}

[$keyPath, $checkedPaths] = resolveKeyPath();
if (!$keyPath) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Service account key not found on the server.',
        'looked_in' => $checkedPaths,
    ]);
    exit;
}

$key = json_decode(file_get_contents($keyPath), true);
$accessToken = getAccessToken($key);

if (!$accessToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not authenticate with Google.']);
    exit;
}

$query = 'ranges=' . implode('&ranges=', array_map('rawurlencode', TABS));
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' . SHEET_ID . '/values:batchGet?' . $query;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $accessToken"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not read the Sheet.', 'details' => json_decode($resp, true)]);
    exit;
}

$data = json_decode($resp, true);
$result = [];
foreach (TABS as $i => $tab) {
    $result[$tab] = $data['valueRanges'][$i]['values'] ?? [];
}

echo json_encode($result);
