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
      totalTokens: 150,
      estimatedCostUsd: 0.001,
      reasoningEffort: 'medium',
      providerResponseId: 'resp_test',
      startedAt: '2026-09-05T00:00:00.000Z',
      finishedAt: '2026-09-05T00:00:01.000Z',
    };
  }

  it('stores searchable sessions, transparent snapshots, proposals and usage', async () => {
    const accounts = adapter.raw.prepare('SELECT id FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order').all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '다음 주 계획 API_KEY=credential-for-regression 선택지를 보여줘',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{"transparent":true}',
      result: resultWithPlan(minutes),
    });

    const savedSession = (await repository.listSessions('계획'))[0];
    expect(savedSession).toMatchObject({
      id: sessionId,
      provider: 'test-provider',
      question: '다음 주 계획 API_KEY=[REDACTED] 선택지를 보여줘',
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

  it('loads proposals only for the currently visible session ids', async () => {
    const accounts = adapter.raw.prepare(
      'SELECT id FROM accounts WHERE deleted_at IS NULL AND archived=0 ORDER BY sort_order',
    ).all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const sessionIds: string[] = [];
    for (const question of ['표시할 분석', '표시하지 않을 분석']) {
      sessionIds.push(await repository.saveSession({
        mode: 'optimize',
        question,
        rangeStart: '2026-08-03',
        rangeEnd: '2026-08-30',
        dataSnapshotJson: '{}',
        result: resultWithPlan(minutes),
      }));
    }

    expect(await repository.listProposalsForSessions([])).toEqual([]);
    const visible = await repository.listProposalsForSessions([sessionIds[0], sessionIds[0]]);
    expect(visible).toHaveLength(1);
    expect(visible[0].sessionId).toBe(sessionIds[0]);
    expect(await repository.listProposalsForSessions(sessionIds)).toHaveLength(2);
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

  it.each(['rationale', 'note'] as const)(
    'rejects a legacy or synced proposal with prohibited %s prose before changing a plan',
    async (field) => {
      const accounts = adapter.raw.prepare(
        'SELECT id FROM accounts WHERE deleted_at IS NULL AND archived=0 ORDER BY sort_order',
      ).all() as { id: string }[];
      const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
      const sessionId = await repository.saveSession({
        mode: 'optimize',
        question: '과거 제안 문구 검증',
        rangeStart: '2026-08-03',
        rangeEnd: '2026-08-30',
        dataSnapshotJson: '{}',
        result: resultWithPlan(minutes),
      });
      const proposal = (await repository.listProposals(sessionId))[0];

      if (field === 'rationale') {
        adapter.raw.prepare('UPDATE ai_proposals SET rationale=? WHERE id=?').run(
          '사용자는 충동적입니다.',
          proposal.id,
        );
      } else {
        adapter.raw.prepare("UPDATE ai_proposals SET payload_json=json_set(payload_json,'$.note',?) WHERE id=?").run(
          '당신은 의욕이 없습니다.',
          proposal.id,
        );
      }

      await expect(repository.applyPlanProposal(proposal.id)).rejects.toThrow('고정 문구 규칙');
      expect(adapter.raw.prepare(
        "SELECT COUNT(*) AS count FROM weekly_plans WHERE week_start='2026-09-07'",
      ).get()).toMatchObject({ count: 0 });
      expect((await repository.listProposals(sessionId))[0]).toMatchObject({ status: 'pending' });
    },
  );

  it('soft-deletes and restores an analysis session with its proposals and sync payloads', async () => {
    const accounts = adapter.raw.prepare(
      'SELECT id FROM accounts WHERE deleted_at IS NULL AND archived=0 ORDER BY sort_order',
    ).all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '삭제와 복구 확인',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{"notes":["private"]}',
      result: resultWithPlan(minutes),
    });
    const proposalId = (await repository.listProposals(sessionId))[0].id;

    await repository.deleteSession(sessionId);

    const sessionRow = adapter.raw.prepare(
      'SELECT deleted_at FROM analysis_sessions WHERE id=?',
    ).get(sessionId) as { deleted_at: string };
    const proposalRow = adapter.raw.prepare(
      'SELECT deleted_at FROM ai_proposals WHERE id=?',
    ).get(proposalId) as { deleted_at: string };
    expect(sessionRow.deleted_at).toBeTruthy();
    expect(proposalRow.deleted_at).toBe(sessionRow.deleted_at);
    expect(await repository.listSessions()).toEqual([]);
    expect(await repository.listProposals(sessionId)).toEqual([]);
    expect((await repository.listDeletedSessions())[0]).toMatchObject({ id: sessionId });
    expect((await repository.usageSummary()).sessions).toBe(0);

    const deletedSessionPayload = adapter.raw.prepare(
      "SELECT payload_json FROM sync_outbox WHERE table_name='analysis_sessions' AND record_id=?",
    ).get(sessionId) as { payload_json: string };
    const deletedProposalPayload = adapter.raw.prepare(
      "SELECT payload_json FROM sync_outbox WHERE table_name='ai_proposals' AND record_id=?",
    ).get(proposalId) as { payload_json: string };
    expect(JSON.parse(deletedSessionPayload.payload_json)).toMatchObject({ deleted_at: sessionRow.deleted_at });
    expect(JSON.parse(deletedProposalPayload.payload_json)).toMatchObject({ deleted_at: sessionRow.deleted_at });

    await repository.restoreSession(sessionId);

    expect((await repository.listSessions())[0]).toMatchObject({ id: sessionId, deletedAt: null });
    expect((await repository.listProposals(sessionId))[0]).toMatchObject({ id: proposalId, status: 'pending' });
    expect(await repository.listDeletedSessions()).toEqual([]);
    expect(await repository.usageSummary()).toMatchObject({
      sessions: 1,
      inputTokens: 100,
      outputTokens: 50,
      estimatedCostUsd: 0.001,
    });
    expect(JSON.parse((adapter.raw.prepare(
      "SELECT payload_json FROM sync_outbox WHERE table_name='analysis_sessions' AND record_id=?",
    ).get(sessionId) as { payload_json: string }).payload_json)).toMatchObject({ deleted_at: null });
    expect(JSON.parse((adapter.raw.prepare(
      "SELECT payload_json FROM sync_outbox WHERE table_name='ai_proposals' AND record_id=?",
    ).get(proposalId) as { payload_json: string }).payload_json)).toMatchObject({ deleted_at: null });
  });

  it('blocks stale proposal actions and restores only child tombstones from the session deletion', async () => {
    const accounts = adapter.raw.prepare(
      'SELECT id FROM accounts WHERE deleted_at IS NULL AND archived=0 ORDER BY sort_order',
    ).all() as { id: string }[];
    const minutes = Object.fromEntries(accounts.map((account) => [account.id, 720]));
    const result = resultWithPlan(minutes);
    result.proposals.push({
      ...result.proposals[0],
      rationale: '별도로 삭제할 두 번째 계획 선택지입니다.',
    });
    const sessionId = await repository.saveSession({
      mode: 'optimize',
      question: '자식 삭제 시각 확인',
      rangeStart: '2026-08-03',
      rangeEnd: '2026-08-30',
      dataSnapshotJson: '{}',
      result,
    });
    const [first, second] = await repository.listProposals(sessionId);
    const independentDeletedAt = '2026-09-01T00:00:00.000Z';
    adapter.raw.prepare('UPDATE ai_proposals SET deleted_at=?,updated_at=? WHERE id=?').run(
      independentDeletedAt,
      independentDeletedAt,
      second.id,
    );

    await repository.deleteSession(sessionId);
    const sessionDeletedAt = (adapter.raw.prepare(
      'SELECT deleted_at FROM analysis_sessions WHERE id=?',
    ).get(sessionId) as { deleted_at: string }).deleted_at;
    adapter.raw.prepare('UPDATE ai_proposals SET deleted_at=NULL WHERE id=?').run(first.id);

    await expect(repository.applyPlanProposal(first.id)).rejects.toThrow('대기 제안');
    await expect(repository.dismissProposal(first.id)).rejects.toThrow('대기 제안');
    expect(adapter.raw.prepare('SELECT status FROM ai_proposals WHERE id=?').get(first.id)).toMatchObject({ status: 'pending' });
    adapter.raw.prepare('UPDATE ai_proposals SET deleted_at=? WHERE id=?').run(sessionDeletedAt, first.id);

    await repository.restoreSession(sessionId);

    expect(adapter.raw.prepare('SELECT deleted_at FROM ai_proposals WHERE id=?').get(first.id)).toMatchObject({ deleted_at: null });
    expect(adapter.raw.prepare('SELECT deleted_at FROM ai_proposals WHERE id=?').get(second.id)).toMatchObject({
      deleted_at: independentDeletedAt,
    });
    expect(adapter.raw.prepare(
      "SELECT COUNT(*) AS count FROM weekly_plans WHERE week_start='2026-09-07'",
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
