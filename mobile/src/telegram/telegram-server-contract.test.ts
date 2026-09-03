import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(process.cwd(), '..');
const migration = readFileSync(
  resolve(repositoryRoot, 'supabase/migrations/20260903010000_phase_3_telegram.sql'),
  'utf8',
);
const functionSource = readFileSync(
  resolve(repositoryRoot, 'supabase/functions/telegram-bot/index.ts'),
  'utf8',
);
const dataSource = readFileSync(
  resolve(repositoryRoot, 'supabase/functions/_shared/telegram-data.ts'),
  'utf8',
);
const aiSource = readFileSync(
  resolve(repositoryRoot, 'supabase/functions/_shared/telegram-ai.ts'),
  'utf8',
);
const config = readFileSync(resolve(repositoryRoot, 'supabase/config.toml'), 'utf8');
const retryMigration = readFileSync(
  resolve(repositoryRoot, 'supabase/migrations/20260903011000_phase_3_retry_safe_updates.sql'),
  'utf8',
);
const setupScript = readFileSync(
  resolve(repositoryRoot, 'supabase/scripts/configure-telegram.ps1'),
  'utf8',
);

describe('Telegram server contract', () => {
  it('creates private connection, idempotency, proposal, and delivery tables', () => {
    expect(migration).toContain('create table if not exists public.telegram_settings');
    expect(migration).toContain('create table if not exists public.telegram_updates');
    expect(migration).toContain('create table if not exists public.telegram_proposals');
    expect(migration).toContain('create table if not exists public.telegram_delivery_log');
    expect(migration.match(/enable row level security/g)).toHaveLength(4);
    expect(migration).toContain('grant update (notification_time, enabled)');
  });

  it('requires both Telegram webhook secret and allowed chat id', () => {
    expect(config).toMatch(/\[functions\.telegram-bot\][\s\S]*verify_jwt = false/);
    expect(functionSource).toContain("x-telegram-bot-api-secret-token");
    expect(functionSource).toContain("TELEGRAM_WEBHOOK_SECRET");
    expect(functionSource).toContain("TELEGRAM_ALLOWED_CHAT_ID");
    expect(functionSource).toContain('update.chatId !== config.allowedChatId');
    expect(functionSource).toContain('claimTelegramUpdate');
  });

  it('keeps bot credentials server-side and records explicit sources', () => {
    expect(functionSource).toContain("requiredEnv('TELEGRAM_BOT_TOKEN')");
    expect(functionSource).toContain("'telegram'");
    expect(functionSource).toContain("'voice'");
    expect(functionSource).not.toMatch(/\d{6,}:[A-Za-z0-9_-]{20,}/);
  });

  it('protects free-text and voice writes with proposal confirmation', () => {
    expect(functionSource).toContain('createTelegramProposal');
    expect(functionSource).toContain('claimTelegramProposal');
    expect(functionSource).toContain("callback_data: `confirm:${proposalId}`");
    expect(aiSource).toContain('기록 적용은 하지 않고 제안만 반환한다.');
    expect(aiSource).toContain('사용자에 대한 성향·심리·동기·위험을 서술하지 않는다.');
  });

  it('contains the daily summary buttons and idempotent delivery claim', () => {
    expect(functionSource).toContain("{ text: '오늘 종료'");
    expect(functionSource).toContain("{ text: '수정'");
    expect(functionSource).toContain("{ text: '나중에'");
    expect(functionSource).toContain('claimDailyDelivery');
  });

  it('makes webhook retries explicit and entry writes deterministic', () => {
    expect(retryMigration).toContain("check (status in ('processing', 'completed', 'failed'))");
    expect(functionSource).toContain('completeTelegramUpdate');
    expect(functionSource).toContain('failTelegramUpdate');
    expect(dataSource).toContain('deterministicUuid');
    expect(dataSource).toContain("onConflict: 'user_id,table_name,local_id'");
  });

  it('keeps one-time setup credentials out of command history and temporary files', () => {
    expect(setupScript).toContain('-AsSecureString');
    expect(setupScript).toContain('ZeroFreeBSTR');
    expect(setupScript).toContain("'secrets', 'set', '--env-file'");
    expect(setupScript).toContain('vault.create_secret');
    expect(setupScript).toContain('Remove-Item -LiteralPath $tempSecretFile -Force');
    expect(setupScript).toContain("secret_token = $webhookSecret");
    expect(setupScript).toContain("$ErrorActionPreference = 'Continue'");
    expect(setupScript).toContain('2>&1');
    expect(setupScript).toContain("if ($exitCode -ne 0)");
    expect(setupScript).toContain('oos_owner_user_id');
    expect(setupScript).not.toContain('ConvertFrom-Json');
    expect(setupScript).toContain('[Console]::OutputEncoding = $utf8NoBom');
    expect(setupScript).toContain("if ([string]$finalWebhook.url -ne $functionUrl)");
    expect(setupScript).not.toMatch(/\d{6,}:[A-Za-z0-9_-]{20,}/);
  });
});
