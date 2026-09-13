import { cache } from "react";
import { and, eq, gte, lte, inArray, desc, sql as dsql } from "drizzle-orm";

import { db } from "./index";
import * as t from "./schema";
import { RUBRIC_SEED } from "@/lib/rubric-seed-data";
import { computeDelta } from "@/lib/utils";

export type DateRange = { from: Date; to: Date };

export function lastNDaysRange(n = 30): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - n * 24 * 60 * 60 * 1000);
  return { from, to };
}

function priorEqualPeriod({ from, to }: DateRange): DateRange {
  const spanMs = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - spanMs), to: new Date(from.getTime()) };
}

export type CallFilters = {
  range?: DateRange;
  associateIds?: string[];
  sources?: string[];
  leadStageCategories?: ("converted" | "in_pipeline" | "lost")[];
  intent?: string[];
};

async function fetchConversationRows(orgId: string, filters: CallFilters = {}) {
  const conditions = [eq(t.conversations.orgId, orgId)];
  if (filters.range) {
    conditions.push(gte(t.conversations.callDate, filters.range.from));
    conditions.push(lte(t.conversations.callDate, filters.range.to));
  }
  if (filters.associateIds?.length) conditions.push(inArray(t.conversations.associateId, filters.associateIds));
  if (filters.sources?.length) conditions.push(inArray(t.conversations.source, filters.sources as (typeof t.conversations.$inferSelect)["source"][]));

  return db
    .select({
      conversation: t.conversations,
      lead: t.leads,
      verdict: t.callVerdicts,
      associate: t.users,
    })
    .from(t.conversations)
    .innerJoin(t.leads, eq(t.conversations.leadId, t.leads.id))
    .leftJoin(t.callVerdicts, eq(t.callVerdicts.callId, t.conversations.id))
    .leftJoin(t.users, eq(t.conversations.associateId, t.users.id))
    .where(and(...conditions));
}

type ConversationRow = Awaited<ReturnType<typeof fetchConversationRows>>[number];

function computeAggregates(rows: ConversationRow[]) {
  const n = rows.length;
  const totalDurationSeconds = rows.reduce((s, r) => s + r.conversation.durationSeconds, 0);
  const avgDurationSeconds = n ? totalDurationSeconds / n : 0;
  const talkRatios = rows.map((r) => r.conversation.talkToListenRatio).filter((v): v is number => v != null);
  const avgTalkToListen = talkRatios.length ? talkRatios.reduce((a, b) => a + b, 0) / talkRatios.length : 0;
  const detailedCallsOver2Min = rows.filter((r) => r.conversation.durationSeconds > 120).length;
  const qualityScores = rows.map((r) => r.verdict?.overallScore).filter((v): v is number => v != null);
  const avgQualityScore = qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;
  const uniqueLeadIds = new Set(rows.map((r) => r.lead.id));
  const connectedCallsPerLead = uniqueLeadIds.size ? n / uniqueLeadIds.size : 0;

  const byStageCategory = { converted: 0, in_pipeline: 0, lost: 0 };
  const seenLeadForStage = new Set<string>();
  for (const r of rows) {
    if (seenLeadForStage.has(r.lead.id)) continue;
    seenLeadForStage.add(r.lead.id);
    byStageCategory[r.lead.leadStageCategory]++;
  }

  const intentCounts: Record<string, number> = { high: 0, moderate: 0, neutral: 0, low: 0, not_qualified: 0, not_available: 0 };
  for (const r of rows) {
    const key = r.conversation.intent ?? "not_available";
    intentCounts[key] = (intentCounts[key] ?? 0) + 1;
  }

  return {
    totalCalls: n,
    totalDurationSeconds,
    avgDurationSeconds,
    avgTalkToListen,
    detailedCallsOver2Min,
    avgQualityScore,
    connectedCallsPerLead,
    uniqueConnectedLeads: uniqueLeadIds.size,
    byStageCategory,
    intentCounts,
  };
}

function withDelta<T extends Record<string, number>>(current: T, previous: T) {
  const out: Record<string, { value: number; deltaPct: number | null; direction: "up" | "down" | "flat" }> = {};
  for (const key of Object.keys(current)) {
    const d = computeDelta(current[key], previous[key]);
    out[key] = { value: current[key], deltaPct: d.pct, direction: d.direction };
  }
  return out;
}

export async function getDashboardData(orgId: string, filters: CallFilters = {}) {
  const range = filters.range ?? lastNDaysRange(30);
  const prevRange = priorEqualPeriod(range);

  const [currentRows, previousRows] = await Promise.all([
    fetchConversationRows(orgId, { ...filters, range }),
    fetchConversationRows(orgId, { ...filters, range: prevRange }),
  ]);

  const current = computeAggregates(currentRows);
  const previous = computeAggregates(previousRows);

  const flatCurrent = {
    totalCalls: current.totalCalls,
    totalDurationSeconds: current.totalDurationSeconds,
    avgDurationSeconds: current.avgDurationSeconds,
    avgTalkToListen: current.avgTalkToListen,
    detailedCallsOver2Min: current.detailedCallsOver2Min,
    avgQualityScore: current.avgQualityScore,
    connectedCallsPerLead: current.connectedCallsPerLead,
    uniqueConnectedLeads: current.uniqueConnectedLeads,
    converted: current.byStageCategory.converted,
    in_pipeline: current.byStageCategory.in_pipeline,
    lost: current.byStageCategory.lost,
    high: current.intentCounts.high,
    moderate: current.intentCounts.moderate,
    neutral: current.intentCounts.neutral,
    low: current.intentCounts.low,
    not_qualified: current.intentCounts.not_qualified,
    not_available: current.intentCounts.not_available,
  };
  const flatPrevious = {
    totalCalls: previous.totalCalls,
    totalDurationSeconds: previous.totalDurationSeconds,
    avgDurationSeconds: previous.avgDurationSeconds,
    avgTalkToListen: previous.avgTalkToListen,
    detailedCallsOver2Min: previous.detailedCallsOver2Min,
    avgQualityScore: previous.avgQualityScore,
    connectedCallsPerLead: previous.connectedCallsPerLead,
    uniqueConnectedLeads: previous.uniqueConnectedLeads,
    converted: previous.byStageCategory.converted,
    in_pipeline: previous.byStageCategory.in_pipeline,
    lost: previous.byStageCategory.lost,
    high: previous.intentCounts.high,
    moderate: previous.intentCounts.moderate,
    neutral: previous.intentCounts.neutral,
    low: previous.intentCounts.low,
    not_qualified: previous.intentCounts.not_qualified,
    not_available: previous.intentCounts.not_available,
  };

  const withD = withDelta(flatCurrent, flatPrevious);

  // Conversion rate for the "Forecasted Sales" tooltip metric (PRD 5.1).
  const conversionRate = current.uniqueConnectedLeads ? current.byStageCategory.converted / current.uniqueConnectedLeads : 0;
  const forecastedSales = Math.round(current.byStageCategory.in_pipeline * conversionRate);

  // Quality category bars — average pass-rate per rubric category across the
  // filtered calls (PRD 5.2 left panel).
  const callIds = currentRows.map((r) => r.conversation.id);
  const categoryBars = await getCategoryScoreBreakdown(orgId, callIds);

  // Key Lead Concerns — org-wide objection taxonomy rollup (PRD 5.2 right panel).
  const concerns = await getKeyLeadConcerns(orgId, callIds);

  return {
    range,
    totalCalls: withD.totalCalls,
    statCards: {
      totalDuration: withD.totalDurationSeconds,
      avgDuration: withD.avgDurationSeconds,
      talkToListenRatio: withD.avgTalkToListen,
      detailedCallsOver2Min: withD.detailedCallsOver2Min,
      callQualityScore: withD.avgQualityScore,
      connectedCallsPerLead: withD.connectedCallsPerLead,
    },
    uniqueConnectedLeads: {
      total: withD.uniqueConnectedLeads,
      won: withD.converted,
      lost: withD.lost,
      inProgress: withD.in_pipeline,
      forecastedSales,
    },
    intentCards: {
      high: withD.high,
      moderate: withD.moderate,
      neutral: withD.neutral,
      low: withD.low,
      notQualified: withD.not_qualified,
      notAvailable: withD.not_available,
    },
    categoryBars,
    concerns,
  };
}

export async function getCategoryScoreBreakdown(orgId: string, callIds: string[]) {
  if (callIds.length === 0) {
    return RUBRIC_SEED.filter((c) => c.weight > 0).map((c) => ({ name: c.name, pct: 0 }));
  }
  const rows = await db
    .select({
      categoryName: t.rubricCategories.name,
      verdict: t.callScores.verdict,
    })
    .from(t.callScores)
    .innerJoin(t.rubricParameters, eq(t.callScores.parameterId, t.rubricParameters.id))
    .innerJoin(t.rubricCategories, eq(t.rubricParameters.categoryId, t.rubricCategories.id))
    .where(and(eq(t.rubricCategories.orgId, orgId), inArray(t.callScores.callId, callIds)));

  const byCategory = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    if (r.verdict === "na") continue;
    const val = r.verdict === "pass" ? 1 : r.verdict === "partial" ? 0.5 : 0;
    const agg = byCategory.get(r.categoryName) ?? { sum: 0, n: 0 };
    agg.sum += val;
    agg.n += 1;
    byCategory.set(r.categoryName, agg);
  }

  return RUBRIC_SEED.filter((c) => c.weight > 0)
    .map((c) => {
      const agg = byCategory.get(c.name);
      return { name: c.name, pct: agg?.n ? Math.round((agg.sum / agg.n) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct);
}

export async function getKeyLeadConcerns(orgId: string, callIds?: string[]) {
  const conditions = [eq(t.concernCategories.orgId, orgId)];
  const rows = await db
    .select({
      categoryId: t.concernCategories.id,
      categoryName: t.concernCategories.name,
      description: t.concernCategories.description,
      callId: t.objections.callId,
    })
    .from(t.objections)
    .innerJoin(t.concernCategories, eq(t.objections.concernCategoryId, t.concernCategories.id))
    .where(and(...conditions, callIds ? inArray(t.objections.callId, callIds.length ? callIds : ["__none__"]) : dsql`true`));

  const totalConcerns = rows.length;
  const uniqueContacts = new Set(rows.map((r) => r.callId)).size;
  const byCategory = new Map<string, { name: string; description: string | null; count: number }>();
  for (const r of rows) {
    const agg = byCategory.get(r.categoryId) ?? { name: r.categoryName, description: r.description, count: 0 };
    agg.count++;
    byCategory.set(r.categoryId, agg);
  }
  const breakdown = [...byCategory.values()]
    .map((v) => ({ ...v, pct: totalConcerns ? Math.round((v.count / totalConcerns) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  return { totalConcerns, uniqueContacts, breakdown };
}

/** Per-lead rollup for the shared 11-column Leads table (PRD 5.3 / 8). */
export async function getLeadsTable(orgId: string, filters: CallFilters = {}, page = 1, pageSize = 10) {
  const leadConditions = [eq(t.leads.orgId, orgId)];
  if (filters.associateIds?.length) leadConditions.push(inArray(t.leads.ownerId, filters.associateIds));
  if (filters.leadStageCategories?.length) leadConditions.push(inArray(t.leads.leadStageCategory, filters.leadStageCategories));

  const allLeads = await db
    .select({ lead: t.leads, owner: t.users })
    .from(t.leads)
    .leftJoin(t.users, eq(t.leads.ownerId, t.users.id))
    .where(and(...leadConditions))
    .orderBy(desc(t.leads.updatedAt));

  const leadIds = allLeads.map((l) => l.lead.id);
  const convoRows = leadIds.length
    ? await db
        .select({ conversation: t.conversations, verdict: t.callVerdicts })
        .from(t.conversations)
        .leftJoin(t.callVerdicts, eq(t.callVerdicts.callId, t.conversations.id))
        .where(inArray(t.conversations.leadId, leadIds))
        .orderBy(desc(t.conversations.callDate))
    : [];

  const byLead = new Map<string, typeof convoRows>();
  for (const row of convoRows) {
    const arr = byLead.get(row.conversation.leadId) ?? [];
    arr.push(row);
    byLead.set(row.conversation.leadId, arr);
  }

  const taskRows = leadIds.length
    ? await db.select().from(t.tasks).where(and(inArray(t.tasks.leadId, leadIds), eq(t.tasks.status, "open")))
    : [];
  const nextTaskByLead = new Map<string, (typeof taskRows)[number]>();
  for (const task of taskRows) {
    const existing = nextTaskByLead.get(task.leadId);
    if (!existing || (task.dueDate && existing.dueDate && task.dueDate < existing.dueDate)) {
      nextTaskByLead.set(task.leadId, task);
    }
  }

  const rows = allLeads.map(({ lead, owner }) => {
    const convos = byLead.get(lead.id) ?? [];
    const latest = convos[0];
    return {
      lead,
      owner,
      conversationCount: convos.length,
      lastConversationAt: latest?.conversation.callDate ?? null,
      nextTask: nextTaskByLead.get(lead.id) ?? null,
      intent: latest?.conversation.intent ?? null,
      qualityScore: latest?.verdict?.overallScore ?? latest?.conversation.qualityScore ?? null,
    };
  });

  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  return { rows: paged, total, page, pageSize };
}

/** Leaderboard: per-associate aggregation (PRD Section 7). */
export async function getLeaderboard(orgId: string, filters: CallFilters = {}) {
  const rows = await fetchConversationRows(orgId, filters);
  const byAssociate = new Map<
    string,
    { associate: NonNullable<(typeof rows)[number]["associate"]>; totalCalls: number; leadIds: Set<string>; highIntent: number; qualitySum: number; qualityN: number; won: number }
  >();
  for (const r of rows) {
    if (!r.associate) continue;
    const agg =
      byAssociate.get(r.associate.id) ??
      { associate: r.associate, totalCalls: 0, leadIds: new Set<string>(), highIntent: 0, qualitySum: 0, qualityN: 0, won: 0 };
    agg.totalCalls++;
    agg.leadIds.add(r.lead.id);
    if (r.conversation.intent === "high") agg.highIntent++;
    if (r.verdict?.overallScore != null) {
      agg.qualitySum += r.verdict.overallScore;
      agg.qualityN++;
    }
    if (r.lead.leadStageCategory === "converted") agg.won++;
    byAssociate.set(r.associate.id, agg);
  }

  return [...byAssociate.values()]
    .map((a) => ({
      associate: a.associate,
      totalCalls: a.totalCalls,
      uniqueLeads: a.leadIds.size,
      highIntentPct: a.totalCalls ? Math.round((a.highIntent / a.totalCalls) * 100) : 0,
      qualityScore: a.qualityN ? Math.round(a.qualitySum / a.qualityN) : 0,
      wonPct: a.leadIds.size ? Math.round((a.won / a.leadIds.size) * 100) : 0,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls);
}

export async function getReviewQueue(orgId: string) {
  const rows = await db
    .select({ conversation: t.conversations, lead: t.leads, verdict: t.callVerdicts, associate: t.users })
    .from(t.callVerdicts)
    .innerJoin(t.conversations, eq(t.callVerdicts.callId, t.conversations.id))
    .innerJoin(t.leads, eq(t.conversations.leadId, t.leads.id))
    .leftJoin(t.users, eq(t.conversations.associateId, t.users.id))
    .where(and(eq(t.conversations.orgId, orgId), inArray(t.callVerdicts.riskLevel, ["needs_review", "high_fabrication_risk"])))
    .orderBy(desc(t.conversations.callDate));
  return rows;
}

export const getLeadDetail = cache(async function getLeadDetail(leadId: string) {
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, leadId) });
  if (!lead) return null;

  const [owner, assignee, convos, tasksRows, notesRows] = await Promise.all([
    lead.ownerId ? db.query.users.findFirst({ where: eq(t.users.id, lead.ownerId) }) : null,
    lead.assigneeId ? db.query.users.findFirst({ where: eq(t.users.id, lead.assigneeId) }) : null,
    db
      .select({ conversation: t.conversations, verdict: t.callVerdicts })
      .from(t.conversations)
      .leftJoin(t.callVerdicts, eq(t.callVerdicts.callId, t.conversations.id))
      .where(eq(t.conversations.leadId, leadId))
      .orderBy(desc(t.conversations.callDate)),
    db.select().from(t.tasks).where(eq(t.tasks.leadId, leadId)).orderBy(desc(t.tasks.createdAt)),
    db
      .select({ note: t.notes, author: t.users })
      .from(t.notes)
      .leftJoin(t.users, eq(t.notes.authorId, t.users.id))
      .where(eq(t.notes.leadId, leadId))
      .orderBy(desc(t.notes.createdAt)),
  ]);

  const totalDurationSeconds = convos.reduce((s, c) => s + c.conversation.durationSeconds, 0);
  const talkRatios = convos.map((c) => c.conversation.talkToListenRatio).filter((v): v is number => v != null);
  const avgTalkToListen = talkRatios.length ? talkRatios.reduce((a, b) => a + b, 0) / talkRatios.length : 0;
  const qualityScores = convos.map((c) => c.verdict?.overallScore).filter((v): v is number => v != null);
  const avgQualityScore = qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;

  const latestScoredCallId = convos.find((c) => c.verdict)?.conversation.id;
  const [objectionRows, dataCaptureRows] = latestScoredCallId
    ? await Promise.all([
        db
          .select({ objection: t.objections, concern: t.concernCategories })
          .from(t.objections)
          .innerJoin(t.concernCategories, eq(t.objections.concernCategoryId, t.concernCategories.id))
          .where(eq(t.objections.callId, latestScoredCallId)),
        db
          .select({ value: t.dataCaptureValues, field: t.dataCaptureFields })
          .from(t.dataCaptureValues)
          .innerJoin(t.dataCaptureFields, eq(t.dataCaptureValues.fieldId, t.dataCaptureFields.id))
          .where(eq(t.dataCaptureValues.callId, latestScoredCallId)),
      ])
    : [[], []];

  return {
    lead,
    owner,
    assignee,
    conversations: convos,
    tasks: tasksRows,
    notes: notesRows,
    stats: { totalDurationSeconds, avgTalkToListen, avgQualityScore, conversationCount: convos.length },
    latestScoredCallId,
    objections: objectionRows,
    dataCapture: dataCaptureRows,
  };
});

export const getConversationDetail = cache(async function getConversationDetail(callId: string) {
  const convo = await db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) });
  if (!convo) return null;
  const [verdict, scoreRows, objectionRows, dataCaptureRows] = await Promise.all([
    db.query.callVerdicts.findFirst({ where: eq(t.callVerdicts.callId, callId) }),
    db
      .select({ score: t.callScores, parameter: t.rubricParameters, category: t.rubricCategories })
      .from(t.callScores)
      .innerJoin(t.rubricParameters, eq(t.callScores.parameterId, t.rubricParameters.id))
      .innerJoin(t.rubricCategories, eq(t.rubricParameters.categoryId, t.rubricCategories.id))
      .where(eq(t.callScores.callId, callId)),
    db
      .select({ objection: t.objections, concern: t.concernCategories })
      .from(t.objections)
      .innerJoin(t.concernCategories, eq(t.objections.concernCategoryId, t.concernCategories.id))
      .where(eq(t.objections.callId, callId)),
    db
      .select({ value: t.dataCaptureValues, field: t.dataCaptureFields })
      .from(t.dataCaptureValues)
      .innerJoin(t.dataCaptureFields, eq(t.dataCaptureValues.fieldId, t.dataCaptureFields.id))
      .where(eq(t.dataCaptureValues.callId, callId)),
  ]);
  return { conversation: convo, verdict, scores: scoreRows, objections: objectionRows, dataCapture: dataCaptureRows };
});

export async function getOrgUsers(orgId: string) {
  return db.select().from(t.users).where(eq(t.users.orgId, orgId)).orderBy(t.users.name);
}

export async function getFilterOptions(orgId: string) {
  const associates = await db.select().from(t.users).where(and(eq(t.users.orgId, orgId), eq(t.users.role, "associate")));
  const sourceRows = await db.selectDistinct({ source: t.conversations.source }).from(t.conversations).where(eq(t.conversations.orgId, orgId));
  return {
    associates: associates.map((a) => ({ id: a.id, label: a.name })),
    sources: sourceRows.map((s) => ({ id: s.source, label: s.source.replace(/_/g, " ") })),
  };
}

export async function getAssociateRollup(orgId: string, range?: DateRange) {
  const leaderboard = await getLeaderboard(orgId, { range });
  const teamAvgQuality = leaderboard.length ? Math.round(leaderboard.reduce((s, a) => s + a.qualityScore, 0) / leaderboard.length) : 0;
  return { leaderboard, teamAvgQuality };
}
