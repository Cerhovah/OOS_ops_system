import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { AnalysisWeeklyComment, AnalysisTextNote } from '@/analysis/packager';
import { serializeAnalysisOutput } from '@/analysis/prompt';
import type { AnalysisRunResult } from '@/analysis/types';
import { parseWeekStartDay, weekRange } from '@/domain/calculations';
import type {
  AiProposal,
  AnalysisMode,
  AnalysisSession,
  PlanChangePayload,
} from '@/types/domain';

type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

export interface SaveAnalysisSessionInput {
  mode: AnalysisMode;
  question: string;
  rangeStart: string;
  rangeEnd: string;
  dataSnapshotJson: string;
  result: AnalysisRunResult;
}

function text(row: Row, key: string): string {
  return String(row[key]);
}

function nullableText(row: Row, key: string): string | null {
  return row[key] === null ? null : String(row[key]);
}

function nullableNumber(row: Row, key: string): number | null {
  return row[key] === null ? null : Number(row[key]);
}

function sessionFromRow(row: Row): AnalysisSession {
  return {
    id: text(row, 'id'),
    mode: text(row, 'mode') as AnalysisMode,
    question: nullableText(row, 'question'),
    rangeStart: text(row, 'range_start'),
    rangeEnd: text(row, 'range_end'),
    dataSnapshotJson: text(row, 'data_snapshot_json'),
    responseText: nullableText(row, 'response_text'),
    provider: nullableText(row, 'provider'),
    model: nullableText(row, 'model'),
    inputTokens: nullableNumber(row, 'input_tokens'),
    outputTokens: nullableNumber(row, 'output_tokens'),
    estimatedCostUsd: nullableNumber(row, 'estimated_cost_usd'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function proposalFromRow(row: Row): AiProposal {
  return {
    id: text(row, 'id'),
    sessionId: text(row, 'session_id'),
    kind: 'plan_change',
    payloadJson: text(row, 'payload_json'),
    rationale: text(row, 'rationale'),
    status: text(row, 'status') as AiProposal['status'],
    appliedAt: nullableText(row, 'applied_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function storedPlanChangePayload(payloadJson: string): PlanChangePayload {
  const value: unknown = JSON.parse(payloadJson);
  if (!isRecord(value) || typeof value.weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.weekStart)) {
    throw new Error('제안에 올바른 주 시작일이 없습니다.');
  }
  if (!isRecord(value.minutesByAccount)) throw new Error('제안에 계정별 계획값이 없습니다.');
  const minutesByAccount: Record<string, number> = {};
  for (const [accountId, minutes] of Object.entries(value.minutesByAccount)) {
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
      throw new Error(`제안 계획값을 확인할 수 없습니다: ${accountId}`);
    }
    minutesByAccount[accountId] = Math.round(minutes);
  }
  if (Object.keys(minutesByAccount).length === 0) throw new Error('제안의 계획 행이 비어 있습니다.');
  const note = value.note === null ? null : typeof value.note === 'string' ? value.note : null;
  return { weekStart: value.weekStart, minutesByAccount, note };
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
        input.question || null,
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
      ? await this.db.getAllAsync<Row>(
        `SELECT * FROM analysis_sessions
         WHERE deleted_at IS NULL AND (question LIKE ? OR response_text LIKE ? OR mode LIKE ?)
         ORDER BY created_at DESC LIMIT ?`,
        pattern,
        pattern,
        pattern,
        limit,
      )
      : await this.db.getAllAsync<Row>(
        'SELECT * FROM analysis_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?',
        limit,
      );
    return rows.map(sessionFromRow);
  }

  async listProposals(sessionId?: string): Promise<AiProposal[]> {
    const rows = sessionId
      ? await this.db.getAllAsync<Row>(
        'SELECT * FROM ai_proposals WHERE deleted_at IS NULL AND session_id=? ORDER BY created_at',
        sessionId,
      )
      : await this.db.getAllAsync<Row>(
        'SELECT * FROM ai_proposals WHERE deleted_at IS NULL ORDER BY created_at DESC',
      );
    return rows.map(proposalFromRow);
  }

  async dismissProposal(proposalId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      "UPDATE ai_proposals SET status='dismissed',updated_at=? WHERE id=? AND status='pending' AND deleted_at IS NULL",
      now,
      proposalId,
    );
  }

  async applyPlanProposal(proposalId: string): Promise<number> {
    let version = 0;
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<Row>(
        "SELECT * FROM ai_proposals WHERE id=? AND kind='plan_change' AND status='pending' AND deleted_at IS NULL",
        proposalId,
      );
      if (!row) throw new Error('적용할 수 있는 대기 제안을 찾지 못했습니다.');
      const payload = storedPlanChangePayload(text(row, 'payload_json'));
      const weekStartSetting = await transaction.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key='week_start_day'",
      );
      if (weekRange(payload.weekStart, parseWeekStartDay(weekStartSetting?.value)).start !== payload.weekStart) {
        throw new Error('제안 날짜가 현재 주 시작 요일과 일치하지 않아 적용하지 않았습니다.');
      }
      const accounts = await transaction.getAllAsync<{ id: string }>(
        'SELECT id FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order,created_at',
      );
      const activeIds = new Set(accounts.map((account) => account.id));
      const proposedIds = Object.keys(payload.minutesByAccount);
      if (proposedIds.length !== activeIds.size || proposedIds.some((id) => !activeIds.has(id))) {
        throw new Error('제안이 현재 사용 중인 모든 시간계정을 포함하지 않아 적용하지 않았습니다.');
      }

      const current = await transaction.getFirstAsync<{ version: number | null }>(
        'SELECT MAX(version) AS version FROM weekly_plans WHERE week_start=?',
        payload.weekStart,
      );
      version = (current?.version ?? 0) + 1;
      const planId = randomUUID();
      const now = new Date().toISOString();
      await transaction.runAsync(
        `INSERT INTO weekly_plans (id,week_start,version,note,source,created_at,updated_at)
         VALUES (?,?,?,?, 'ai_applied',?,?)`,
        planId,
        payload.weekStart,
        version,
        payload.note || text(row, 'rationale'),
        now,
        now,
      );
      for (const account of accounts) {
        await transaction.runAsync(
          `INSERT INTO weekly_plan_lines
            (id,weekly_plan_id,account_id,planned_minutes,created_at,updated_at)
           VALUES (?,?,?,?,?,?)`,
          randomUUID(),
          planId,
          account.id,
          payload.minutesByAccount[account.id],
          now,
          now,
        );
      }
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
