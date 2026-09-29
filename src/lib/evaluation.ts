export type EvaluationMode = "recruitment" | "in_service";

export type Metric = {
  name: string;
  shortName: string;
  anchors: Record<1 | 3 | 5, string>;
  action: string;
};

export const metrics: Metric[] = [
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
  const focus = metrics[Math.max(0, focusIndex)] ?? metrics[0];
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