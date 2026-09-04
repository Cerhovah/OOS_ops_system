import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { parsePlanChangePayload } from '@/analysis/plan-proposal';
import { isAnalysisProseAllowed, serializeAnalysisOutput } from '@/analysis/prompt';
import { redactSensitiveText } from '@/analysis/redaction';
import type { AnalysisTextNote, AnalysisWeeklyComment } from '@/analysis/snapshot-types';
import type { AnalysisRunResult } from '@/analysis/types';
import {
  sqliteNullableNumber,
  sqliteNullableText,
  sqliteText,
  type SqlRow,
} from '@/data/sqlite-row';
import { appendWeeklyPlanVersion } from '@/data/weekly-plan-writer';
import { parseWeekStartDay, weekRange } from '@/domain/calculations';
import type {
  AiProposal,
  AnalysisMode,
  AnalysisSession,
} from '@/types/domain';

interface SaveAnalysisSessionInput {
  mode: AnalysisMode;
  question: string;
  rangeStart: string;
  rangeEnd: string;
  dataSnapshotJson: string;
  result: AnalysisRunResult;
}

function sessionFromRow(row: SqlRow): AnalysisSession {
  return {
    id: sqliteText(row, 'id'),
    mode: sqliteText(row, 'mode') as AnalysisMode,
    question: sqliteNullableText(row, 'question'),
    rangeStart: sqliteText(row, 'range_start'),
    rangeEnd: sqliteText(row, 'range_end'),
    dataSnapshotJson: sqliteText(row, 'data_snapshot_json'),
    responseText: sqliteNullableText(row, 'response_text'),
    provider: sqliteNullableText(row, 'provider'),
    model: sqliteNullableText(row, 'model'),
    inputTokens: sqliteNullableNumber(row, 'input_tokens'),
    outputTokens: sqliteNullableNumber(row, 'output_tokens'),
    estimatedCostUsd: sqliteNullableNumber(row, 'estimated_cost_usd'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

function proposalFromRow(row: SqlRow): AiProposal {
  return {
    id: sqliteText(row, 'id'),
    sessionId: sqliteText(row, 'session_id'),
    kind: 'plan_change',
    payloadJson: sqliteText(row, 'payload_json'),
    rationale: sqliteText(row, 'rationale'),
    status: sqliteText(row, 'status') as AiProposal['status'],
    appliedAt: sqliteNullableText(row, 'applied_at'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export class AnalysisRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listSourceNotes(rangeStart: string, rangeEnd: string): Promise<{
    dayNotes: AnalysisTextNote[];
    weeklyComments: AnalysisWeeklyComment[];
  }> {
    const [dayRows, weekRows] = await Promise.all([
      this.db.getAllAsync<{ date: string; text: string }>(
        'SELECT date,text FROM day_notes WHERE deleted_at IS NULL AND date BETWEEN ? AND ? ORDER BY date DESC',
        rangeStart,
        rangeEnd,
      ),
      this.db.getAllAsync<{ week_start: string; text: string }>(
        'SELECT week_start,text FROM weekly_comments WHERE deleted_at IS NULL AND week_start BETWEEN ? AND ? ORDER BY week_start DESC',
        rangeStart,
        rangeEnd,
      ),
    ]);
    return {
      dayNotes: dayRows.map((row) => ({ date: row.date, text: row.text })),
      weeklyComments: weekRows.map((row) => ({ weekStart: row.week_start, text: row.text })),
    };
  }

  async saveSession(input: SaveAnalysisSessionInput): Promise<string> {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO analysis_sessions
          (id,mode,question,range_start,range_end,data_snapshot_json,response_text,provider,model,
           input_tokens,output_tokens,estimated_cost_usd,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        sessionId,
        input.mode,
        redactSensitiveText(input.question) || null,
        input.rangeStart,
        input.rangeEnd,
        input.dataSnapshotJson,
        serializeAnalysisOutput(input.result),
        input.result.provider,
        input.result.model,
        input.result.inputTokens,
        input.result.outputTokens,
        input.result.estimatedCostUsd,
        now,
        now,
      );
      for (const proposal of input.result.proposals) {
        await transaction.runAsync(
          `INSERT INTO ai_proposals
            (id,session_id,kind,payload_json,rationale,status,applied_at,created_at,updated_at)
           VALUES (?,?,?,?,?,'pending',NULL,?,?)`,
          randomUUID(),
          sessionId,
          proposal.kind,
          JSON.stringify(proposal.payload),
          proposal.rationale,
          now,
          now,
        );
      }
    });
    return sessionId;
  }

  async listSessions(search = '', limit = 50): Promise<AnalysisSession[]> {
    const pattern = `%${search.trim()}%`;
    const rows = search.trim()
      ? await this.db.getAllAsync<SqlRow>(
        `SELECT * FROM analysis_sessions
         WHERE deleted_at IS NULL AND (question LIKE ? OR response_text LIKE ? OR mode LIKE ?)
         ORDER BY created_at DESC LIMIT ?`,
        pattern,
        pattern,
        pattern,
        limit,
      )
      : await this.db.getAllAsync<SqlRow>(
        'SELECT * FROM analysis_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?',
        limit,
      );
    return rows.map(sessionFromRow);
  }

  async listDeletedSessions(limit = 50, offset = 0): Promise<AnalysisSession[]> {
    const rows = await this.db.getAllAsync<SqlRow>(
      'SELECT * FROM analysis_sessions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ? OFFSET ?',
      limit,
      offset,
    );
    return rows.map(sessionFromRow);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const session = await transaction.getFirstAsync<SqlRow>(
        'SELECT deleted_at FROM analysis_sessions WHERE id=?',
        sessionId,
      );
      if (!session) throw new Error('삭제할 분석 세션을 찾지 못했습니다.');
      if (sqliteNullableText(session, 'deleted_at')) return;

      const now = new Date().toISOString();
      await transaction.runAsync(
        'UPDATE ai_proposals SET deleted_at=?,updated_at=? WHERE session_id=? AND deleted_at IS NULL',
        now,
        now,
        sessionId,
      );
      await transaction.runAsync(
        'UPDATE analysis_sessions SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL',
        now,
        now,
        sessionId,
      );
    });
  }

  async restoreSession(sessionId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const session = await transaction.getFirstAsync<SqlRow>(
        'SELECT deleted_at FROM analysis_sessions WHERE id=?',
        sessionId,
      );
      if (!session) throw new Error('복구할 분석 세션을 찾지 못했습니다.');
      const deletedAt = sqliteNullableText(session, 'deleted_at');
      if (!deletedAt) return;

      const now = new Date().toISOString();
      await transaction.runAsync(
        'UPDATE analysis_sessions SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at=?',
        now,
        sessionId,
        deletedAt,
      );
      await transaction.runAsync(
        'UPDATE ai_proposals SET deleted_at=NULL,updated_at=? WHERE session_id=? AND deleted_at=?',
        now,
        sessionId,
        deletedAt,
      );
    });
  }

  async listProposals(sessionId: string): Promise<AiProposal[]> {
    const rows = await this.db.getAllAsync<SqlRow>(
      `SELECT proposal.* FROM ai_proposals proposal
       JOIN analysis_sessions session ON session.id=proposal.session_id
       WHERE proposal.deleted_at IS NULL AND session.deleted_at IS NULL AND proposal.session_id=?
       ORDER BY proposal.created_at`,
      sessionId,
    );
    return rows.map(proposalFromRow);
  }

  async listProposalsForSessions(sessionIds: readonly string[]): Promise<AiProposal[]> {
    const uniqueSessionIds = [...new Set(sessionIds)];
    if (uniqueSessionIds.length === 0) return [];
    const placeholders = uniqueSessionIds.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<SqlRow>(
      `SELECT proposal.* FROM ai_proposals proposal
       JOIN analysis_sessions session ON session.id=proposal.session_id
       WHERE proposal.deleted_at IS NULL AND session.deleted_at IS NULL
         AND proposal.session_id IN (${placeholders})
       ORDER BY proposal.created_at DESC`,
      ...uniqueSessionIds,
    );
    return rows.map(proposalFromRow);
  }

  async dismissProposal(proposalId: string): Promise<void> {
    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `UPDATE ai_proposals SET status='dismissed',updated_at=?
       WHERE id=? AND status='pending' AND deleted_at IS NULL
       AND EXISTS (
         SELECT 1 FROM analysis_sessions
         WHERE analysis_sessions.id=ai_proposals.session_id AND analysis_sessions.deleted_at IS NULL
       )`,
      now,
      proposalId,
    );
    if (result.changes === 0) throw new Error('무시할 수 있는 대기 제안을 찾지 못했습니다.');
  }

  async applyPlanProposal(proposalId: string): Promise<number> {
    let version = 0;
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<SqlRow>(
        `SELECT proposal.* FROM ai_proposals proposal
         JOIN analysis_sessions session ON session.id=proposal.session_id
         WHERE proposal.id=? AND proposal.kind='plan_change' AND proposal.status='pending'
         AND proposal.deleted_at IS NULL AND session.deleted_at IS NULL`,
        proposalId,
      );
      if (!row) throw new Error('적용할 수 있는 대기 제안을 찾지 못했습니다.');
      const payload = parsePlanChangePayload(sqliteText(row, 'payload_json'));
      const rationale = sqliteText(row, 'rationale');
      if (
        !rationale.trim()
        || !isAnalysisProseAllowed(rationale)
        || (payload.note !== null && !isAnalysisProseAllowed(payload.note))
      ) {
        throw new Error('제안 문구가 고정 문구 규칙을 통과하지 못해 적용하지 않았습니다.');
      }
      const weekStartSetting = await transaction.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key='week_start_day'",
      );
      if (weekRange(payload.weekStart, parseWeekStartDay(weekStartSetting?.value)).start !== payload.weekStart) {
        throw new Error('제안 날짜가 현재 주 시작 요일과 일치하지 않아 적용하지 않았습니다.');
      }
      const accounts = await transaction.getAllAsync<{ id: string }>(
        'SELECT id FROM accounts WHERE deleted_at IS NULL AND archived=0 ORDER BY sort_order,created_at',
      );
      const activeIds = new Set(accounts.map((account) => account.id));
      const proposedIds = Object.keys(payload.minutesByAccount);
      if (proposedIds.length !== activeIds.size || proposedIds.some((id) => !activeIds.has(id))) {
        throw new Error('제안이 현재 사용 중인 모든 시간계정을 포함하지 않아 적용하지 않았습니다.');
      }

      const now = new Date().toISOString();
      version = await appendWeeklyPlanVersion(transaction, {
        weekStart: payload.weekStart,
        minutesByAccount: payload.minutesByAccount,
        source: 'ai_applied',
        note: payload.note || rationale,
        now,
      });
      await transaction.runAsync(
        "UPDATE ai_proposals SET status='applied',applied_at=?,updated_at=? WHERE id=? AND status='pending'",
        now,
        now,
        proposalId,
      );
    });
    return version;
  }

  async usageSummary(): Promise<{ sessions: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }> {
    const row = await this.db.getFirstAsync<{
      sessions: number;
      input_tokens: number;
      output_tokens: number;
      estimated_cost_usd: number;
    }>(
      `SELECT COUNT(*) AS sessions,
        COALESCE(SUM(input_tokens),0) AS input_tokens,
        COALESCE(SUM(output_tokens),0) AS output_tokens,
        COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd
       FROM analysis_sessions WHERE deleted_at IS NULL`,
    );
    return {
      sessions: Number(row?.sessions ?? 0),
      inputTokens: Number(row?.input_tokens ?? 0),
      outputTokens: Number(row?.output_tokens ?? 0),
      estimatedCostUsd: Number(row?.estimated_cost_usd ?? 0),
    };
  }
}
