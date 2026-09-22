<?php
// Обработчик заявок: принимает телеграм от формы и шлёт в бота.
// Токен ЗДЕСЬ, на сервере — в браузере он не виден.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://camp.derzayvdesign.com');
header('Access-Control-Allow-Methods: POST');

$TOKEN   = '8608450294:AAFuBjZMCcAhucGmbIj50N7JnieK5CRlV9M';
$CHAT_ID = '474424104';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = $_POST;

$tg      = isset($data['tg'])      ? trim((string)$data['tg'])      : '';
$tariff  = isset($data['tariff'])  ? trim((string)$data['tariff'])  : '—';

// Простая защита от мусора
$tg     = mb_substr(strip_tags($tg), 0, 120);
$tariff = mb_substr(strip_tags($tariff), 0, 60);

if ($tg === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'empty']);
  exit;
}

$text = "🔥 Новая заявка с сайта\n\n"
      . "💼 Тариф: {$tariff}\n"
      . "📱 Telegram: {$tg}\n"
      . "🕐 " . date('d.m.Y H:i');

$ch = curl_init("https://api.telegram.org/bot{$TOKEN}/sendMessage");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_TIMEOUT => 10,
  CURLOPT_POSTFIELDS => http_build_query([
    'chat_id'    => $CHAT_ID,
    'text'       => $text,
  ]),
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo json_encode(['ok' => $code === 200]);
