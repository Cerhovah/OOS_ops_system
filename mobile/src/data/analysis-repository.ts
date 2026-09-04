import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { parsePlanChangePayload } from '@/analysis/plan-proposal';
import { serializeAnalysisOutput } from '@/analysis/prompt';
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

  async listProposals(sessionId?: string): Promise<AiProposal[]> {
    const rows = sessionId
      ? await this.db.getAllAsync<SqlRow>(
        'SELECT * FROM ai_proposals WHERE deleted_at IS NULL AND session_id=? ORDER BY created_at',
        sessionId,
      )
      : await this.db.getAllAsync<SqlRow>(
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
      const row = await transaction.getFirstAsync<SqlRow>(
        "SELECT * FROM ai_proposals WHERE id=? AND kind='plan_change' AND status='pending' AND deleted_at IS NULL",
        proposalId,
      );
      if (!row) throw new Error('적용할 수 있는 대기 제안을 찾지 못했습니다.');
      const payload = parsePlanChangePayload(sqliteText(row, 'payload_json'));
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
        note: payload.note || sqliteText(row, 'rationale'),
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
