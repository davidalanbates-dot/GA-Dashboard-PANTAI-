<?php
// Reads the Pantai dashboard's Google Sheet through a restricted service
// account and returns each tab's rows as JSON, so the Sheet itself no
// longer needs to be shared "Anyone with the link" — only the service
// account (and whichever humans edit it monthly) can open it.
//
// IMPORTANT: the service-account JSON key must live OUTSIDE this folder
// (outside public_html), e.g. one level up at ../secrets/service-account.json.
// Never upload the key itself into the same folder as this file.

header('Content-Type: application/json');

define('KEY_PATH', __DIR__ . '/../secrets/service-account.json');

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

if (!file_exists(KEY_PATH)) {
    http_response_code(500);
    echo json_encode(['error' => 'Service account key not found on the server.']);
    exit;
}

$key = json_decode(file_get_contents(KEY_PATH), true);
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
