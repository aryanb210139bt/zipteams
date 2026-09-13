/**
 * Seeds a demo organization end to end: rubric, roster, glossary,
 * qualification rules, concern taxonomy, data-capture schema, leads,
 * conversations, and their scores/verdicts — enough for every dashboard,
 * the leaderboard, the review queue, and lead detail to render real data
 * with zero external services. Run with `npm run db:seed`.
 *
 * Idempotent-ish: re-running wipes and re-creates the single demo org
 * (matched by name) rather than accumulating duplicates.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "./index";
import * as t from "./schema";
import { RUBRIC_SEED } from "../rubric-seed-data";

// Deterministic PRNG so re-seeding produces the same demo dataset.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const pickN = <T>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;

const ORG_NAME = "Kalvium";

const ASSOCIATE_ROSTER = [
  { name: "Aparna Pillai", slug: "aparna.pillai", role: "admin" as const },
  { name: "Sushmitha K", slug: "sushmitha.k", role: "qa_reviewer" as const },
  { name: "Farthun H", slug: "farthun.h", role: "associate" as const },
  { name: "Ganavi Nagaraj", slug: "ganavi.nagaraj", role: "associate" as const },
  { name: "Hemalatha Rajendran", slug: "hemalatha.rajendran", role: "associate" as const },
  { name: "Madihia M", slug: "madihia.m", role: "associate" as const },
  { name: "Mehataj K", slug: "mehataj.k", role: "associate" as const },
  { name: "Rupali Sinha", slug: "rupali.sinha", role: "associate" as const },
  { name: "Shivaranjini S", slug: "shivaranjini", role: "associate" as const },
  { name: "Sneha Padmanabhan", slug: "sneha.padmanabhan", role: "associate" as const },
];

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Ishaan", "Kabir", "Riya", "Ananya", "Diya", "Meera", "Sara", "Rohan", "Kavya", "Arjun", "Nisha", "Sanjay", "Priya", "Vikram", "Neha", "Karan", "Pooja", "Aisha", "Rahul", "Tanvi", "Yash"];
const LAST_NAMES = ["Sharma", "Verma", "Iyer", "Nair", "Reddy", "Gupta", "Menon", "Rao", "Kulkarni", "Bose", "Chatterjee", "Joshi", "Kapoor", "Malhotra", "Bhatt"];

const CONCERN_CATEGORIES = [
  { name: "Exam Difficulty and Admission Barriers", description: "Concerns about JEE/entrance exam difficulty or eligibility for the program." },
  { name: "Fee & Affordability Concerns", description: "Concerns about program cost, EMI/loan options, or scholarships." },
  { name: "Placement / Career Outcomes Doubt", description: "Skepticism about job placement rates or salary outcomes." },
  { name: "Program Duration & Time Commitment", description: "Concerns about the program's length or weekly time commitment." },
  { name: "Comparison with Traditional Degree", description: "Lead is weighing this program against a traditional college degree." },
  { name: "Parental / Family Approval", description: "Lead needs to convince a parent or guardian before proceeding." },
];

const GLOSSARY_SEED: { term: string; mistranscriptions: string[] }[] = [
  { term: "Kalvium", mistranscriptions: ["Calvium", "Calvin", "Kalvin", "Kelvium"] },
  { term: "JEE", mistranscriptions: ["G", "Jee", "J"] },
  { term: "BITSAT", mistranscriptions: ["Bit sat", "Beat sat"] },
  { term: "Leadsquared", mistranscriptions: ["Lead squared", "Lead Squad"] },
  { term: "Bengaluru", mistranscriptions: ["Bangalore", "Bengalooru"] },
  { term: "B.Tech", mistranscriptions: ["Beetech", "B tech"] },
];

const DATA_CAPTURE_FIELDS = [
  { key: "budget", label: "Budget", fieldType: "text" as const },
  { key: "authority", label: "Authority", fieldType: "text" as const },
  { key: "needs", label: "Needs", fieldType: "text" as const },
  { key: "timeline", label: "Timeline", fieldType: "text" as const },
  { key: "competitor", label: "Competitor", fieldType: "text" as const },
  { key: "objection", label: "Objection", fieldType: "text" as const },
  { key: "objection_handling", label: "Objection Handling", fieldType: "text" as const },
  { key: "customer_location", label: "Customer Location", fieldType: "text" as const },
  { key: "jee_other_exams", label: "JEE / Other Exams", fieldType: "text" as const },
  { key: "decision_maker", label: "Decision Maker", fieldType: "text" as const },
  { key: "email_id", label: "Email ID", fieldType: "text" as const },
  { key: "jee_coaching", label: "JEE Coaching", fieldType: "select" as const, selectOptions: ["Yes", "No"] },
  { key: "jee_percentile", label: "JEE Percentile", fieldType: "text" as const },
  { key: "course_college", label: "Course/College interested in", fieldType: "text" as const },
];

const QUALIFICATION_RULES = [
  { ruleText: "A lead is Sales-Qualified only if they have completed or are appearing for Class 12 in the current or next academic year.", supportingQuote: "I'm currently in 12th, appearing for boards this March." },
  { ruleText: "Leads below a 60th percentile in JEE Mains are steered toward the foundation-track cohort rather than the advanced-track cohort.", supportingQuote: "My JEE percentile was around 45." },
  { ruleText: "A lead is not eligible for the EMI-only fee plan without a co-signing parent/guardian on the call or a follow-up call.", supportingQuote: "Can my dad join the next call to talk about the EMI option?" },
  { ruleText: "Leads who cannot commit at least 20 hours/week are flagged as low-fit for the intensive cohort and offered the part-time track instead.", supportingQuote: "I'm also doing a full-time diploma, so I don't have much free time." },
];

const OBJECTION_LINES: Record<string, { statement: string; handling: string; satisfied: boolean }[]> = {
  "Exam Difficulty and Admission Barriers": [
    { statement: "I'm worried I won't qualify since my JEE percentile isn't that high.", handling: "Explained the foundation track exists precisely for this, with extra mentoring in the first two months.", satisfied: true },
  ],
  "Fee & Affordability Concerns": [
    { statement: "The program fee feels steep compared to a regular college.", handling: "Walked through the ISA (income-share) and EMI options and the placement-linked repayment model.", satisfied: true },
  ],
  "Placement / Career Outcomes Doubt": [
    { statement: "How do I know I'll actually get placed after this?", handling: "Shared the last cohort's placement percentage and named two hiring partners relevant to the lead's interest area.", satisfied: false },
  ],
  "Program Duration & Time Commitment": [
    { statement: "Four years feels like a long commitment.", handling: "Clarified the degree-plus-work model and that paid apprenticeship starts from year 2.", satisfied: true },
  ],
  "Comparison with Traditional Degree": [
    { statement: "My parents want me to just do a normal B.Tech.", handling: "Offered to include a parent on the next call and share the accreditation + university partner details.", satisfied: false },
  ],
  "Parental / Family Approval": [
    { statement: "I need to check with my parents before deciding anything.", handling: "Scheduled a joint call with the parent for this weekend and sent a WhatsApp summary to share with them.", satisfied: true },
  ],
};

function synthTranscript(associateName: string, leadName: string, objectionStatement?: string) {
  const lines: (typeof t.conversations.$inferInsert)["transcriptRaw"] = [
    { speaker: "associate", startSeconds: 0, endSeconds: 12, text: `Hi ${leadName}, this is ${associateName.split(" ")[0]} calling from Kalvium. Do you have a few minutes to talk about the program you enquired about?` },
    { speaker: "lead", startSeconds: 12, endSeconds: 20, text: "Yes, sure, go ahead." },
    { speaker: "associate", startSeconds: 20, endSeconds: 45, text: "Great — so tell me a bit about where you are right now, are you still in school or have you already given your entrance exams?" },
    { speaker: "lead", startSeconds: 45, endSeconds: 60, text: "I'm in 12th grade right now, planning to appear for JEE this year." },
    { speaker: "associate", startSeconds: 60, endSeconds: 95, text: "Got it. Kalvium is a four-year program combining a B.Tech degree with real industry apprenticeship starting from year two, so you earn while you learn." },
  ];
  if (objectionStatement) {
    lines.push({ speaker: "lead", startSeconds: 95, endSeconds: 110, text: objectionStatement });
    lines.push({ speaker: "associate", startSeconds: 110, endSeconds: 150, text: "That's a fair question — let me walk you through how we handle that." });
  }
  lines.push({ speaker: "associate", startSeconds: 150, endSeconds: 175, text: "I'll send you the brochure over WhatsApp and let's plan a follow-up call with your parents this week — does that work?" });
  lines.push({ speaker: "lead", startSeconds: 175, endSeconds: 185, text: "Yes, that works for me." });
  return lines;
}

function overallScoreFor(verdictsByCategory: Record<string, number[]>) {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const cat of RUBRIC_SEED) {
    if (cat.weight === 0) continue;
    const vals = verdictsByCategory[cat.name] ?? [];
    if (!vals.length) continue;
    const catAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    weightedSum += catAvg * cat.weight;
    weightTotal += cat.weight;
  }
  return weightTotal ? Math.round((weightedSum / weightTotal) * 100) : 0;
}

async function main() {
  console.log(`[seed] wiping existing "${ORG_NAME}" org (if any)...`);
  const existing = await db.query.organizations.findFirst({ where: eq(t.organizations.name, ORG_NAME) });
  if (existing) {
    await db.delete(t.organizations).where(eq(t.organizations.id, existing.id));
  }

  const [org] = await db
    .insert(t.organizations)
    .values({ name: ORG_NAME, workspaceName: "Default", leadsquaredConfig: { enabled: false } })
    .returning();
  console.log(`[seed] created org ${org.id}`);

  const users = await db
    .insert(t.users)
    .values(
      ASSOCIATE_ROSTER.map((a) => ({
        orgId: org.id,
        role: a.role,
        name: a.name,
        email: `${a.slug}@kalvium.com`,
      }))
    )
    .returning();
  const associates = users.filter((u) => u.role === "associate");
  const qaReviewer = users.find((u) => u.role === "qa_reviewer")!;
  console.log(`[seed] created ${users.length} users`);

  // Rubric
  const categoryRows = await db
    .insert(t.rubricCategories)
    .values(RUBRIC_SEED.map((c, i) => ({ orgId: org.id, name: c.name, weight: c.weight, sortOrder: i })))
    .returning();
  const paramRowsByCategory: Record<string, (typeof t.rubricParameters.$inferSelect)[]> = {};
  for (const [i, cat] of RUBRIC_SEED.entries()) {
    const categoryId = categoryRows[i].id;
    const rows = await db
      .insert(t.rubricParameters)
      .values(cat.parameters.map((p, j) => ({ categoryId, text: p.text, weight: p.weight, supportsPartialCredit: p.supportsPartialCredit, sortOrder: j })))
      .returning();
    paramRowsByCategory[cat.name] = rows;
  }
  console.log(`[seed] created ${categoryRows.length} rubric categories`);

  // Concern taxonomy
  const concernRows = await db
    .insert(t.concernCategories)
    .values(CONCERN_CATEGORIES.map((c) => ({ orgId: org.id, name: c.name, description: c.description })))
    .returning();

  // Glossary
  await db.insert(t.glossaryTerms).values(
    GLOSSARY_SEED.map((g) => ({ orgId: org.id, term: g.term, commonMistranscriptions: g.mistranscriptions }))
  );

  // Data capture schema
  const dataCaptureFieldRows = await db
    .insert(t.dataCaptureFields)
    .values(DATA_CAPTURE_FIELDS.map((f, i) => ({ orgId: org.id, key: f.key, label: f.label, fieldType: f.fieldType, selectOptions: "selectOptions" in f ? f.selectOptions : undefined, sortOrder: i })))
    .returning();

  // Qualification rules
  await db.insert(t.qualificationRules).values(QUALIFICATION_RULES.map((r) => ({ orgId: org.id, ruleText: r.ruleText, supportingQuote: r.supportingQuote })));

  // Companies (lead-gen channels)
  const companyRows = await db
    .insert(t.companies)
    .values([{ orgId: org.id, name: "Organic / Website" }, { orgId: org.id, name: "Meta Ads" }, { orgId: org.id, name: "Partner College Fair" }])
    .returning();

  console.log("[seed] creating leads + conversations...");
  const LEAD_STAGES: (typeof t.leads.$inferInsert)["leadStage"][] = ["converted", "in_progress_calls", "not_converted"];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const sources: (typeof t.conversations.$inferInsert)["source"][] = [
    "ozonetel", "dialpad", "zipteams_dashboard", "whatsapp_chat", "click_to_call", "crm_recordings", "manually_uploaded",
  ];

  let totalConversations = 0;
  const reviewQueueTargets = 4; // how many calls we want in needs_review/high_risk for a non-empty queue
  let riskyPlaced = 0;

  for (let li = 0; li < 26; li++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const owner = pick(associates);
    const leadStage = pick(LEAD_STAGES);
    const leadStageCategory = leadStage === "converted" ? "converted" : leadStage === "not_converted" ? "lost" : "in_pipeline";
    const intentScore = int(20, 96);
    const daysAgoCreated = int(2, 55);

    const [lead] = await db
      .insert(t.leads)
      .values({
        orgId: org.id,
        companyId: pick(companyRows).id,
        name,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        phone: `+91 9${int(100000000, 999999999)}`,
        ownerId: owner.id,
        assigneeId: chance(0.7) ? owner.id : null,
        leadStage,
        leadStageCategory,
        dispositionStatus: leadStage === "converted" ? "Enrolled" : leadStage === "not_converted" ? "Not interested" : "Follow-up scheduled",
        intentScore,
        leadQualityScore: Math.round(intentScore * (0.8 + rand() * 0.3)),
        emailStatus: pick(["Delivered", "Opened", "Clicked", "Replied"]),
        whatsappStatus: pick(["Sent", "Delivered", "Read", "Replied"]),
        nextTaskDueDate: new Date(now + int(1, 10) * DAY),
        createdAt: new Date(now - daysAgoCreated * DAY),
        updatedAt: new Date(now - int(0, daysAgoCreated) * DAY),
      })
      .returning();

    const numConvos = int(1, 3);
    for (let ci = 0; ci < numConvos; ci++) {
      const daysAgo = int(0, daysAgoCreated);
      const withObjection = chance(0.6);
      const concern = withObjection ? pick(concernRows) : null;
      const objectionLine = concern ? pick(OBJECTION_LINES[concern.name] ?? []) : undefined;
      const durationSeconds = int(120, 1500);
      const talkRatio = 0.35 + rand() * 0.4;

      const [convo] = await db
        .insert(t.conversations)
        .values({
          orgId: org.id,
          leadId: lead.id,
          associateId: owner.id,
          source: pick(sources),
          direction: chance(0.85) ? "outbound" : "inbound",
          audioUrl: null,
          durationSeconds,
          callDate: new Date(now - daysAgo * DAY - int(0, 23) * 3600_000),
          status: "scored",
          transcriptRaw: synthTranscript(owner.name, name, objectionLine?.statement),
          transcriptTranslated: synthTranscript(owner.name, name, objectionLine?.statement),
          talkToListenRatio: talkRatio,
          llmPromptVersion: "seed-v1",
        })
        .returning();
      totalConversations++;

      // Decide whether this call is a fabrication/needs-review outlier.
      const forceRisky = riskyPlaced < reviewQueueTargets && chance(0.18);
      if (forceRisky) riskyPlaced++;
      const riskLevel = forceRisky
        ? pick(["needs_review", "high_fabrication_risk"] as const)
        : chance(0.05)
          ? "needs_review"
          : "likely_genuine";

      // Score every rubric parameter.
      const verdictsByCategory: Record<string, number[]> = {};
      const scoreInsertValues: (typeof t.callScores.$inferInsert)[] = [];
      for (const cat of RUBRIC_SEED) {
        const rows = paramRowsByCategory[cat.name];
        const isAuthenticity = cat.name === "Authenticity / Fabrication Risk";
        const isEthical = cat.name === "Ethical Red Flags";
        for (const row of rows) {
          let verdict: (typeof t.callScores.$inferInsert)["verdict"];
          if ((isAuthenticity || isEthical) && riskLevel === "high_fabrication_risk") {
            verdict = chance(0.7) ? "fail" : "partial";
          } else if ((isAuthenticity || isEthical) && riskLevel === "needs_review") {
            verdict = chance(0.5) ? "partial" : "pass";
          } else {
            const r = rand();
            verdict = r < 0.68 ? "pass" : r < 0.88 ? "partial" : r < 0.97 ? "fail" : "na";
          }
          const verdictValue = verdict === "pass" ? 1 : verdict === "partial" ? 0.5 : verdict === "fail" ? 0 : NaN;
          if (!Number.isNaN(verdictValue)) {
            (verdictsByCategory[cat.name] ??= []).push(verdictValue);
          }
          scoreInsertValues.push({
            callId: convo.id,
            parameterId: row.id,
            verdict,
            supportingQuote: verdict !== "na" ? objectionLine?.statement ?? "Associate followed the standard call flow at this point." : null,
            confidence: Math.round((0.6 + rand() * 0.39) * 100) / 100,
            aiRationale:
              verdict === "pass"
                ? "Clearly demonstrated in the transcript."
                : verdict === "partial"
                  ? "Partially addressed — present but not thorough."
                  : verdict === "fail"
                    ? "Not observed in the transcript."
                    : "Not applicable to this call.",
            llmPromptVersion: "seed-v1",
          });
        }
      }
      await db.insert(t.callScores).values(scoreInsertValues);

      const overallScore = overallScoreFor(verdictsByCategory);
      await db.insert(t.callVerdicts).values({
        callId: convo.id,
        overallScore,
        riskLevel,
        fabricationRationale:
          riskLevel === "high_fabrication_risk"
            ? "Multiple authenticity checks failed: the lead's replies do not track the associate's questions and portions of the audio read as scripted."
            : riskLevel === "needs_review"
              ? "One or two authenticity signals were inconclusive — a human pass is recommended before trusting this score."
              : "No fabrication signals detected; conversation reads as a genuine two-way exchange.",
        summary: `${owner.name.split(" ")[0]} called ${name} about the program; ${objectionLine ? `handled a ${concern?.name.toLowerCase()} objection` : "covered the standard pitch"} and ${chance(0.5) ? "scheduled a follow-up" : "is awaiting a decision"}.`,
        overallComment: riskLevel !== "likely_genuine" && chance(0.4) ? "Reviewed — associate coached on call opening." : null,
        reviewedByUserId: riskLevel !== "likely_genuine" && chance(0.3) ? qaReviewer.id : null,
        reviewedAt: riskLevel !== "likely_genuine" && chance(0.3) ? new Date(now - int(0, 3) * DAY) : null,
        llmPromptVersion: "seed-v1",
      });

      // Update conversation rollups used by tables/dashboard.
      const intentVal =
        overallScore >= 75 ? "high" : overallScore >= 55 ? "moderate" : overallScore >= 35 ? "neutral" : overallScore >= 15 ? "low" : "not_qualified";
      await db.update(t.conversations).set({ qualityScore: overallScore, intent: intentVal }).where(eq(t.conversations.id, convo.id));

      if (concern && objectionLine) {
        await db.insert(t.objections).values({
          callId: convo.id,
          concernCategoryId: concern.id,
          statement: objectionLine.statement,
          handling: objectionLine.handling,
          customerSatisfied: objectionLine.satisfied,
        });
      }

      // A handful of data-capture values per call.
      const filledFields = pickN(dataCaptureFieldRows, int(2, 5));
      for (const f of filledFields) {
        let value: string | null = null;
        switch (f.key) {
          case "budget": value = pick(["Not discussed", "₹2-3L range", "Needs EMI option", "Flexible"]); break;
          case "timeline": value = pick(["This admission cycle", "Next year", "Undecided"]); break;
          case "decision_maker": value = pick(["Self", "Parent", "Self + Parent"]); break;
          case "jee_coaching": value = pick(["Yes", "No"]); break;
          case "jee_percentile": value = String(int(30, 99)); break;
          case "course_college": value = pick(["Computer Science track", "Undecided track", "Design track"]); break;
          case "customer_location": value = pick(["Bengaluru", "Pune", "Hyderabad", "Delhi NCR", "Chennai", "Remote/Tier-2 city"]); break;
          default: value = chance(0.5) ? "Mentioned briefly, no strong signal." : null;
        }
        if (value) {
          await db.insert(t.dataCaptureValues).values({ callId: convo.id, fieldId: f.id, value, sourceTimestampSeconds: int(10, durationSeconds - 10) });
        }
      }
    }

    // Next-step task per lead.
    await db.insert(t.tasks).values({
      orgId: org.id,
      leadId: lead.id,
      title: leadStage === "converted" ? "Send onboarding kit" : "Follow up on outstanding objection",
      description: "Auto-generated next step from the most recent call's Path to Conversion.",
      sayScript: "Hi, just following up on our last conversation — did you get a chance to discuss it with your family?",
      rationale: "Re-engaging within 48 hours of the last call keeps intent from decaying.",
      dueDate: new Date(now + int(1, 7) * DAY),
      status: chance(0.25) ? "done" : "open",
    });

    if (chance(0.35)) {
      await db.insert(t.notes).values({ leadId: lead.id, authorId: owner.id, body: "Lead prefers evening calls after 6pm." });
    }
  }

  console.log(`[seed] created 26 leads / ${totalConversations} conversations (targeted ${riskyPlaced} into the review queue)`);
  console.log("[seed] done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
