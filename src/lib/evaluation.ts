export type EvaluationMode = "recruitment" | "in_service";

export type Metric = {
  name: string;
  shortName: string;
  anchors: Record<1 | 3 | 5, string>;
  action: string;
};

export type ImprovementArea = {
  metric: Metric;
  score: number;
  observedGap: string;
  nextStep: string;
  evidenceToLookFor: string;
};

export type DetailedFeedback = {
  summary: string;
  strengths: Array<{ metric: Metric; score: number; evidence: string }>;
  improvements: ImprovementArea[];
  practicePlan: string[];
  reviewPrompt: string;
};

export const metrics: [Metric, ...Metric[]] = [
  {
    name: "Activity-Based Learning",
    shortName: "Activity learning",
    anchors: {
      1: "Lectures throughout; students only listen or copy.",
      3: "Includes one guided activity, but most students remain passive.",
      5: "Students learn through a purposeful, hands-on task and explain what they discovered.",
    },
    action: "Replace five minutes of explanation with a student task that produces a visible answer.",
  },
  {
    name: "Resource Utilization",
    shortName: "Resources",
    anchors: {
      1: "Relies only on verbal explanation or blackboard copying.",
      3: "Uses one relevant resource, with limited student interaction.",
      5: "Uses accessible materials that help students test, model, or visualize the concept.",
    },
    action: "Prepare one low-cost object or visual that students can handle during the lesson.",
  },
  {
    name: "Real-Time Comprehension",
    shortName: "Comprehension",
    anchors: {
      1: "Moves through the lesson without checking understanding.",
      3: "Uses choral responses such as ‘Did everyone get that?’ without verifying individuals.",
      5: "Uses randomized, targeted pulse checks across ability levels and adapts immediately.",
    },
    action: "Ask three students of different readiness levels to explain the idea in their own words.",
  },
  {
    name: "Active Engagement",
    shortName: "Engagement",
    anchors: {
      1: "Only a few students respond while most remain passive.",
      3: "About half the class participates when prompted.",
      5: "Nearly every student speaks, writes, demonstrates, or collaborates during the lesson.",
    },
    action: "Use think–pair–share so every student prepares and voices an answer.",
  },
  {
    name: "Differentiation",
    shortName: "Differentiation",
    anchors: {
      1: "Gives the same task and support to every student despite visible struggle.",
      3: "Offers extra explanation after students ask for help.",
      5: "Plans distinct prompts or scaffolds and checks that struggling learners can rejoin the task.",
    },
    action: "Prepare one hint card for struggling learners and one extension prompt for early finishers.",
  },
  {
    name: "Higher-Order Thinking",
    shortName: "Higher-order",
    anchors: {
      1: "Questions test only recall of facts or procedures.",
      3: "Asks students to explain one answer or compare two examples.",
      5: "Students justify, analyze, predict, or create using the lesson concept.",
    },
    action: "Add one ‘why’ or ‘what if’ question that requires evidence, not recall.",
  },
  {
    name: "Classroom Management",
    shortName: "Management",
    anchors: {
      1: "Disruptions repeatedly stop learning; responses are reactive or punitive.",
      3: "Restores order with reminders, but transitions lose time.",
      5: "Uses clear routines, calm redirection, and empathy while learning continues.",
    },
    action: "Teach and rehearse one 30-second transition routine at the start of the next class.",
  },
  {
    name: "Clarity of Instruction",
    shortName: "Clarity",
    anchors: {
      1: "Directions are vague; students repeat the same error.",
      3: "Explains step by step and most learners follow the worked example.",
      5: "Uses accessible language, a relatable example, and reframes until understanding is visible.",
    },
    action: "Model one worked example, then ask a student to restate each step.",
  },
  {
    name: "Peer-to-Peer Interaction",
    shortName: "Peer interaction",
    anchors: {
      1: "All interaction runs between teacher and individual students.",
      3: "Students briefly discuss, but roles and purpose are unclear.",
      5: "Structured pairs or groups explain, challenge, and build on one another’s thinking.",
    },
    action: "Assign speaker and checker roles for one two-minute peer explanation.",
  },
  {
    name: "Real-World Application",
    shortName: "Application",
    anchors: {
      1: "Presents the concept without connection to students’ lives.",
      3: "Mentions a familiar example but does not use it to deepen understanding.",
      5: "Students apply the concept to a relevant local situation and explain the connection.",
    },
    action: "Ask students to solve one example drawn from home, market, travel, or community life.",
  },
];

export function calculateResult(scores: number[], mode: EvaluationMode) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  const tier = total <= 24 ? "Critical" : total <= 39 ? "Developing" : "Proficient";
  const lowestScore = Math.min(...scores);
  const focusIndex = scores.findIndex((score) => score === lowestScore);
  const focus: Metric = metrics[Math.max(0, focusIndex)] ?? metrics[0];
  const verdict =
    mode === "recruitment"
      ? total >= 40
        ? "Recommend hire"
        : total >= 30
          ? "Conditional — coaching plan required"
          : "Do not progress"
      : tier === "Proficient"
        ? "Ready to lead peer practice"
        : tier === "Developing"
          ? "One focused practice cycle"
          : "Stabilize core classroom routines";

  return { total, tier, focus, verdict };
}

function observedGap(metric: Metric, score: number) {
  if (score <= 1) return metric.anchors[1];
  if (score === 2) return `Practice is emerging, but it is not yet consistent. Current evidence sits between: ${metric.anchors[1]} and ${metric.anchors[3]}`;
  if (score === 3) return metric.anchors[3];
  if (score === 4) return `Strong practice is visible, but not yet consistent across the class. The target is: ${metric.anchors[5]}`;
  return metric.anchors[5];
}

export function getDetailedFeedback(scores: number[]): DetailedFeedback {
  const ranked = metrics
    .map((metric, index) => ({ metric, score: scores[index] ?? 0, index }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
  const improvements = ranked.slice(0, 3).map(({ metric, score }) => ({
    metric,
    score,
    observedGap: observedGap(metric, score),
    nextStep: metric.action,
    evidenceToLookFor: `Look for movement toward: ${score < 3 ? metric.anchors[3] : metric.anchors[5]}`,
  }));
  const strengths = [...ranked]
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 2)
    .map(({ metric, score }) => ({ metric, score, evidence: observedGap(metric, score) }));
  const total = scores.reduce((sum, score) => sum + score, 0);
  const primary = improvements[0] ?? {
    metric: metrics[0],
    score: scores[0] ?? 0,
    observedGap: "",
    nextStep: "",
    evidenceToLookFor: "",
  };
  const band = total >= 40 ? "Proficient" : total >= 25 ? "Developing" : "Critical";
  const bandMeaning =
    band === "Proficient"
      ? "strong routines are largely consistent, and further gains come from refinement rather than repair"
      : band === "Developing"
        ? "several effective routines are present, but they are not yet consistent across students or lesson phases"
        : "core classroom routines need stabilization before more advanced practices can take hold";
  const lead = strengths[0] ?? { metric: metrics[0], score: 0, evidence: "" };
  const support = strengths[1] ?? lead;
  const lowerFirst = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : trimmed;
  };
  const secondary = improvements[1];
  const tertiary = improvements[2];
  const summary = [
    `At ${total} of 50 points, this lesson sits in the ${band.toLowerCase()} band: ${bandMeaning}.`,
    `The strongest behaviors were ${lead.metric.name} (${lead.score}/5) and ${support.metric.name} (${support.score}/5) — what was visible matches "${lowerFirst(lead.evidence)}".`,
    `The widest gap is ${primary.metric.name} (${primary.score}/5), where the observation matches "${lowerFirst(primary.observedGap)}".`,
    `This gap matters because it is the one behavior that most limits what students actually do with the lesson, and the fastest lever is a single observable change: ${primary.metric.action}`,
    secondary ? `${secondary.metric.name} (${secondary.score}/5) should stabilize next${tertiary ? `, followed by ${tertiary.metric.name} (${tertiary.score}/5)` : ""}, so the plan stays focused instead of trying to fix everything at once.` : "",
    `The four-step practice cycle below scripts exactly how to make that first change stick in a real lesson.`,
    `${primary.evidenceToLookFor}. At the next review, bring that student evidence and judge the routine against it, not on impressions.`,
    `Improving one behavior per cycle keeps the change visible to students within a single unit, and gives every observer the same written standard to measure against.`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    summary,
    strengths,
    improvements,
    practicePlan: [
      `Plan: choose one lesson and script this change — ${primary.metric.action}`,
      `Practice: rehearse the routine once before class and use it at a clearly marked point in the lesson.`,
      `Observe: collect evidence from at least three students, including one who usually needs additional support.`,
      `Reflect: note what changed, what did not, and one adjustment for the next lesson.`,
    ],
    reviewPrompt: `At the next review, compare student evidence in ${primary.metric.name.toLowerCase()} and decide whether the routine is ready to keep, adapt, or replace.`,
  };
}