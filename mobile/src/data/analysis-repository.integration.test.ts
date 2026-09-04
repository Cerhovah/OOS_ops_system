/// <reference types="node" />

import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnalysisRunResult } from '@/analysis/types';
import { TestSQLiteDatabase } from '@/test/sqlite-adapter';

import { AnalysisRepository } from './analysis-repository';
import { migrateDatabase } from './migrations';

vi.mock('expo-crypto', () => ({ randomUUID: nodeRandomUUID }));

describe('AnalysisRepository with real SQLite', () => {
  let adapter: TestSQLiteDatabase;
  let repository: AnalysisRepository;

  beforeEach(async () => {
    adapter = new TestSQLiteDatabase();
    await migrateDatabase(adapter.asExpoDatabase());
    repository = new AnalysisRepository(adapter.asExpoDatabase());
  });

  afterEach(() => adapter.close());

  function resultWithPlan(minutesByAccount: Readonly<Record<string, number>>): AnalysisRunResult {
    return {
      answer: '다음 주 계획 선택지입니다.',
      numbersUsed: [{ label: '계획 합계', value: 10080, unit: '분', period: '2026-09-07~2026-09-13' }],
      proposals: [{
        kind: 'plan_change',
        payload: { weekStart: '2026-09-07', minutesByAccount, note: 'AI 계획 선택지' },
        rationale: '계정별 계획 합계를 제안합니다.',
      }],
      structured: true,
      warning: null,
      provider: 'test-provider',
      model: 'test-model',
      inputTokens: 100,
      outputTokens: 50,
      estimatedCostUsd: 0.001,
    };
  }

  it('stores searchable sessions, transparent snapshots, proposals and usage', async () => {
    const accounts = adapter.raw.prepare('SELECT id FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order').all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '다음 주 계획 선택지를 보여줘',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{"transparent":true}',
      result: resultWithPlan(minutes),
    });

    const savedSession = (await repository.listSessions('계획'))[0];
    expect(savedSession).toMatchObject({
      id: sessionId,
      provider: 'test-provider',
      dataSnapshotJson: '{"transparent":true}',
    });
    expect(JSON.parse(savedSession.responseText ?? '{}')).toMatchObject({
      answer: '다음 주 계획 선택지입니다.',
      numbers_used: [{ value: 10080, unit: '분' }],
    });
    expect((await repository.listProposals(sessionId))[0]).toMatchObject({ status: 'pending' });
    expect(await repository.usageSummary()).toEqual({
      sessions: 1,
      inputTokens: 100,
      outputTokens: 50,
      estimatedCostUsd: 0.001,
    });
    expect(adapter.raw.prepare("SELECT COUNT(*) AS count FROM weekly_plans WHERE week_start='2026-09-07'").get()).toMatchObject({ count: 0 });
  });

  it('applies a complete plan proposal only after the explicit method call', async () => {
    const accounts = adapter.raw.prepare('SELECT id FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order').all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '다음 주 계획',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{}',
      result: resultWithPlan(minutes),
    });
    const proposal = (await repository.listProposals(sessionId))[0];
    const queuedBefore = adapter.raw.prepare(
      "SELECT COUNT(*) AS count FROM sync_outbox WHERE table_name IN ('weekly_plans','weekly_plan_lines','ai_proposals')",
    ).get() as { count: number };

    const version = await repository.applyPlanProposal(proposal.id);

    expect(version).toBe(1);
    expect(adapter.raw.prepare(
      "SELECT source,version FROM weekly_plans WHERE week_start='2026-09-07'",
    ).get()).toMatchObject({ source: 'ai_applied', version: 1 });
    expect(adapter.raw.prepare(
      "SELECT COUNT(*) AS count FROM weekly_plan_lines WHERE weekly_plan_id=(SELECT id FROM weekly_plans WHERE week_start='2026-09-07')",
    ).get()).toMatchObject({ count: accounts.length });
    expect((await repository.listProposals(sessionId))[0]).toMatchObject({ status: 'applied' });
    expect(adapter.raw.prepare(
      "SELECT COUNT(*) AS count FROM sync_outbox WHERE table_name IN ('weekly_plans','weekly_plan_lines','ai_proposals')",
    ).get()).toMatchObject({ count: queuedBefore.count + accounts.length + 1 });
  });

  it('applies proposals against visible accounts without recreating archived plan lines', async () => {
    adapter.raw.prepare("UPDATE accounts SET archived=1 WHERE id='seed-account-sleep'").run();
    const accounts = adapter.raw.prepare(
      'SELECT id FROM accounts WHERE deleted_at IS NULL AND archived=0 ORDER BY sort_order',
    ).all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '보관 계정 제외 계획',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{}',
      result: resultWithPlan(minutes),
    });
    const proposal = (await repository.listProposals(sessionId))[0];

    await expect(repository.applyPlanProposal(proposal.id)).resolves.toBe(1);
    expect(adapter.raw.prepare(
      "SELECT COUNT(*) AS count FROM weekly_plan_lines WHERE weekly_plan_id=(SELECT id FROM weekly_plans WHERE week_start='2026-09-07')",
    ).get()).toMatchObject({ count: accounts.length });
    expect(adapter.raw.prepare(
      "SELECT COUNT(*) AS count FROM weekly_plan_lines WHERE account_id='seed-account-sleep' AND weekly_plan_id=(SELECT id FROM weekly_plans WHERE week_start='2026-09-07')",
    ).get()).toMatchObject({ count: 0 });
  });

  it('rejects an incomplete proposal without changing plans and can dismiss it', async () => {
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '불완전 계획',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{}',
      result: resultWithPlan({ 'seed-account-sleep': 2940 }),
    });
    const proposal = (await repository.listProposals(sessionId))[0];

    await expect(repository.applyPlanProposal(proposal.id)).rejects.toThrow('모든 시간계정');
    expect(adapter.raw.prepare("SELECT COUNT(*) AS count FROM weekly_plans WHERE week_start='2026-09-07'").get()).toMatchObject({ count: 0 });

    await repository.dismissProposal(proposal.id);
    expect((await repository.listProposals(sessionId))[0]).toMatchObject({ status: 'dismissed' });
  });

  it('rejects a proposal whose date is not the configured week start', async () => {
    const accounts = adapter.raw.prepare('SELECT id FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order').all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const result = resultWithPlan(minutes);
    result.proposals[0] = {
      ...result.proposals[0],
      payload: { ...result.proposals[0].payload, weekStart: '2026-09-08' },
    };
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '주 시작 검증',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{}',
      result,
    });
    const proposal = (await repository.listProposals(sessionId))[0];

    await expect(repository.applyPlanProposal(proposal.id)).rejects.toThrow('주 시작 요일');
    expect(adapter.raw.prepare("SELECT COUNT(*) AS count FROM weekly_plans WHERE week_start='2026-09-08'").get()).toMatchObject({ count: 0 });
  });
});
