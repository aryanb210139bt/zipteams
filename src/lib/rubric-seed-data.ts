/**
 * The fixed multi-parameter audit rubric. Seeded into `rubric_categories` /
 * `rubric_parameters` by `src/lib/db/seed.ts`, and re-usable from the Setup >
 * Rubric editor's "Restore defaults" action.
 *
 * "Authenticity / Fabrication Risk" is excluded from the weighted overall
 * quality score (weight 0) — it is diagnostic input to `call_verdicts.riskLevel`
 * instead, alongside the dedicated Claude authenticity pass in
 * `lib/integrations/claude.ts`.
 */

export type SeedParameter = {
  text: string;
  weight: "minor" | "important" | "critical";
  supportsPartialCredit: boolean;
};

export type SeedCategory = {
  name: string;
  /** Relative weight in the overall score. 0 = diagnostic-only. */
  weight: number;
  parameters: SeedParameter[];
};

export const RUBRIC_SEED: SeedCategory[] = [
  {
    name: "Authenticity / Fabrication Risk",
    weight: 0,
    parameters: [
      { text: "The call reflects a genuine two-way conversation, not a fabricated or one-sided recording.", weight: "critical", supportsPartialCredit: false },
      { text: "The lead's responses are contextually consistent with the associate's questions.", weight: "critical", supportsPartialCredit: false },
      { text: "No scripted or robotic reading of both sides is detected.", weight: "critical", supportsPartialCredit: false },
      { text: "Call duration and spoken content are consistent with each other (no padded silence or looped audio).", weight: "important", supportsPartialCredit: true },
    ],
  },
  {
    name: "Compliance",
    weight: 1,
    parameters: [
      { text: "Associate identifies themselves and the institution they represent.", weight: "critical", supportsPartialCredit: false },
      { text: "No misleading claims about placement guarantees, rankings, or outcomes.", weight: "critical", supportsPartialCredit: false },
      { text: "Required disclosures (fees, refund policy, eligibility) are given accurately.", weight: "important", supportsPartialCredit: true },
    ],
  },
  {
    name: "Introduction",
    weight: 1,
    parameters: [
      { text: "Greeting & Introduction: associate opens warmly and states their name.", weight: "important", supportsPartialCredit: true },
      { text: "Call Purpose is stated clearly within the first minute.", weight: "important", supportsPartialCredit: true },
      { text: "Associate confirms the lead's identity and prior context (e.g. form fill, previous call).", weight: "minor", supportsPartialCredit: true },
    ],
  },
  {
    name: "Discovery",
    weight: 1.5,
    parameters: [
      { text: "Discovery & Probing: associate asks open-ended questions to understand the lead's goals.", weight: "critical", supportsPartialCredit: true },
      { text: "Active Listening: associate references what the lead said earlier in the call.", weight: "important", supportsPartialCredit: true },
      { text: "Captures BANT-relevant information (budget, authority/decision-maker, need, timeline).", weight: "important", supportsPartialCredit: true },
    ],
  },
  {
    name: "Program Pitch",
    weight: 1.5,
    parameters: [
      { text: "Program Overview / Learning Model is explained clearly.", weight: "critical", supportsPartialCredit: true },
      { text: "Need-Based Pitch: the pitch is tailored to the lead's stated goals, not a generic script.", weight: "important", supportsPartialCredit: true },
      { text: "Key outcomes, curriculum highlights, and format are covered.", weight: "minor", supportsPartialCredit: true },
    ],
  },
  {
    name: "Differentiation",
    weight: 1,
    parameters: [
      { text: "Program Differentiation / USP is clearly articulated.", weight: "important", supportsPartialCredit: true },
      { text: "Comparison to alternatives is addressed when the lead raises it.", weight: "minor", supportsPartialCredit: true },
    ],
  },
  {
    name: "Objection Handling",
    weight: 1.5,
    parameters: [
      { text: "Objections are acknowledged before being addressed.", weight: "important", supportsPartialCredit: true },
      { text: "Objection Handling: response directly addresses the lead's specific concern.", weight: "critical", supportsPartialCredit: true },
      { text: "Associate checks whether the lead is satisfied with the response.", weight: "minor", supportsPartialCredit: true },
    ],
  },
  {
    name: "Webinar CTA",
    weight: 1,
    parameters: [
      { text: "Lead is invited to a webinar, demo, or information session.", weight: "important", supportsPartialCredit: true },
      { text: "A clear next-step (call, meeting) is proposed and scheduled.", weight: "important", supportsPartialCredit: true },
      { text: "Parent / decision-maker engagement is invited where relevant.", weight: "minor", supportsPartialCredit: true },
    ],
  },
  {
    name: "Closure",
    weight: 1.5,
    parameters: [
      { text: "Closing Action Item: call ends with a concrete, dated next step.", weight: "critical", supportsPartialCredit: true },
      { text: "Urgency is created appropriately, without pressure tactics.", weight: "important", supportsPartialCredit: true },
      { text: "Counselling Conversion: associate attempts to move the lead toward enrollment.", weight: "important", supportsPartialCredit: true },
    ],
  },
  {
    name: "Soft Skills",
    weight: 1,
    parameters: [
      { text: "Engagement: associate builds rapport and keeps the lead talking.", weight: "important", supportsPartialCredit: true },
      { text: "Basic call etiquette (greeting, hold/mute usage, sign-off) is followed.", weight: "minor", supportsPartialCredit: true },
      { text: "Professionalism is maintained throughout (tone, pace, language).", weight: "important", supportsPartialCredit: true },
    ],
  },
  {
    name: "Ethical Red Flags",
    weight: 2,
    parameters: [
      { text: "No high-pressure or manipulative sales tactics are used.", weight: "critical", supportsPartialCredit: false },
      { text: "No false urgency or artificial scarcity claims (e.g. fake seat-limit deadlines).", weight: "critical", supportsPartialCredit: false },
      { text: "Associate does not discourage the lead from consulting family or comparing options.", weight: "critical", supportsPartialCredit: false },
    ],
  },
];
