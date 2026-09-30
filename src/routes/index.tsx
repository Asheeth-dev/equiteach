import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import teacherPortrait from "@/assets/deepa-raman.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateResult, metrics, type EvaluationMode } from "@/lib/evaluation";
import { saveEvaluation } from "@/lib/evaluations.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EquiTeach — Objective Teacher Evaluation" },
      { name: "description", content: "Run a calibrated classroom observation and turn evidence into a hiring verdict or teacher coaching plan." },
      { property: "og:title", content: "EquiTeach — Objective Teacher Evaluation" },
      { property: "og:description", content: "Behavior-anchored classroom observation with instant, actionable results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquiTeach,
});

type Stage = "setup" | "observe" | "result";
type SavedResult = ReturnType<typeof calculateResult> & { id?: string; action?: string };

function EquiTeach() {
  const save = useServerFn(saveEvaluation);
  const [stage, setStage] = useState<Stage>("setup");
  const [teacherName, setTeacherName] = useState("Deepa Raman");
  const [classSubject, setClassSubject] = useState("Class VIII · Science");
  const [mode, setMode] = useState<EvaluationMode>("recruitment");
  const [scores, setScores] = useState<number[]>(Array(10).fill(0));
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);

  const completed = scores.filter(Boolean).length;
  const current = metrics[activeIndex] ?? metrics[0];
  const liveTotal = scores.reduce((sum, score) => sum + score, 0);
  const projectedTotal = completed ? Math.round((liveTotal / completed) * 10) : 0;
  const liveTier = projectedTotal <= 24 ? "Critical" : projectedTotal <= 39 ? "Developing" : "Proficient";
  const currentScore = scores[activeIndex] ?? 0;

  const lowestCurrent = useMemo(() => {
    const scored = scores.map((score, index) => ({ score, index })).filter(({ score }) => score > 0);
    scored.sort((a, b) => a.score - b.score);
    return scored[0] ? (metrics[scored[0].index] ?? metrics[0]) : current;
  }, [scores, current]);

  const selectScore = (score: number) => {
    setScores((existing) => existing.map((value, index) => (index === activeIndex ? score : value)));
  };

  const continueObservation = () => {
    if (!currentScore) return;
    const nextUnscored = scores.findIndex((score, index) => index > activeIndex && score === 0);
    if (nextUnscored >= 0) setActiveIndex(nextUnscored);
    else {
      const anyUnscored = scores.findIndex((score) => score === 0);
      if (anyUnscored >= 0) setActiveIndex(anyUnscored);
    }
  };

  const submitEvaluation = async () => {
    if (completed !== 10) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await save({ data: { teacherName, classSubject, mode, scores } });
      const local = calculateResult(scores, mode);
      setSavedResult({ ...local, id: result.id, action: result.action });
      setStage("result");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The evaluation could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setScores(Array(10).fill(0));
    setActiveIndex(0);
    setSavedResult(null);
    setSaveError("");
    setStage("setup");
  };

  return (
    <div className="min-h-screen bg-paper text-foreground antialiased">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-foreground font-display text-lg font-semibold text-background">E</span>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-semibold">EquiTeach</p>
              <p className="font-mono text-[10px] uppercase text-ink-soft">Observation instrument</p>
            </div>
          </div>
          {stage !== "setup" && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-medium uppercase text-accent-foreground ring-1 ring-primary/20">
              <span className="size-1.5 rounded-full bg-primary" />
              {mode === "recruitment" ? "Recruitment mode" : "In-service review"}
            </span>
          )}
          {stage !== "setup" && (
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[13px] font-semibold">{teacherName}</p>
                <p className="font-mono text-[10px] text-ink-soft">{classSubject}</p>
              </div>
              <img src={teacherPortrait} alt="Deepa Raman" width={64} height={64} className="size-9 rounded-full object-cover ring-1 ring-border" />
            </div>
          )}
        </div>
      </header>

      {stage === "setup" && (
        <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <section className="rise max-w-2xl">
            <p className="font-mono text-[11px] font-medium uppercase text-primary">Pedagogical intelligence · Built for evidence</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.04] sm:text-6xl">Evaluate what teachers do, not how they perform.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">A calibrated 10-point observation converts visible classroom behavior into a defensible hiring decision or a practical coaching plan.</p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 border-t border-line pt-5">
              {[['10', 'behavior metrics'], ['1–5', 'anchored scoring'], ['Instant', 'action plan']].map(([value, label]) => (
                <div key={label}><p className="font-display text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-ink-soft">{label}</p></div>
              ))}
            </div>
          </section>
          <section className="rise rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <img src={teacherPortrait} alt="Deepa Raman" width={128} height={128} className="size-14 rounded-2xl object-cover ring-1 ring-border" />
              <div><p className="font-mono text-[10px] uppercase text-primary">New observation</p><h2 className="font-display text-xl font-semibold">Set the classroom context</h2></div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="space-y-2"><Label htmlFor="teacher">Teacher name</Label><Input id="teacher" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="class">Class and subject</Label><Input id="class" value={classSubject} onChange={(event) => setClassSubject(event.target.value)} /></div>
              <div className="space-y-2">
                <Label>Evaluation mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([['recruitment', 'Recruitment demo'], ['in_service', 'In-service review']] as const).map(([value, label]) => (
                    <Button key={value} type="button" variant={mode === value ? "scoreActive" : "score"} onClick={() => setMode(value)}>{label}</Button>
                  ))}
                </div>
              </div>
              <Button variant="instrument" className="mt-2 h-11 w-full" disabled={teacherName.trim().length < 2 || classSubject.trim().length < 2} onClick={() => setStage("observe")}>
                Begin guided observation <ChevronRight />
              </Button>
            </div>
          </section>
        </main>
      )}

      {stage === "observe" && (
        <main className="mx-auto grid max-w-6xl grid-cols-12 gap-5 px-4 py-5 sm:px-5 sm:py-6">
          <aside className="rise col-span-12 lg:col-span-3">
            <div className="rounded-[26px] border border-line bg-card p-4 backdrop-blur-xl">
              <div className="flex items-baseline justify-between"><p className="font-mono text-[10px] uppercase text-ink-soft">Rubric · 10 metrics</p><p className="font-mono text-[11px] font-medium">{String(completed).padStart(2, '0')}/10</p></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completed * 10}%` }} /></div>
              <ol className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-5 lg:grid-cols-1">
                {metrics.map((metric, index) => {
                  const score = scores[index];
                  const active = index === activeIndex;
                  return (
                    <li key={metric.name}>
                      <button type="button" onClick={() => setActiveIndex(index)} className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors", active ? "bg-accent ring-1 ring-primary/25" : "hover:bg-muted")}>
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-medium", score ? "bg-foreground text-background" : active ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-ink-soft")}>{index + 1}</span>
                        <span className={cn("min-w-0 flex-1 truncate", active && "font-semibold")}>{metric.shortName}</span>
                        <span className="font-mono text-[12px] text-ink-soft">{score || '–'}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          <section className="rise col-span-12 lg:col-span-6">
            <div className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase text-ink-soft">Active metric · {String(activeIndex + 1).padStart(2, '0')}</span><span className="rounded-full bg-amber-soft px-2.5 py-1 font-mono text-[10px] font-medium uppercase text-amber ring-1 ring-amber/30">BARS anchor</span></div>
              <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight">{current.name}</h1>
              <p className="mt-2 text-sm text-ink-soft">Select the behavior closest to what you observed. Scores 2 and 4 represent the space between anchors.</p>
              <div className="mt-5 space-y-2.5">
                {([1, 3, 5] as const).map((anchor) => (
                  <button key={anchor} type="button" onClick={() => selectScore(anchor)} className={cn("flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", currentScore === anchor ? "border-primary/40 bg-accent ring-1 ring-primary/20" : "border-line bg-background/40 hover:border-primary/30")}>
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-medium", currentScore === anchor ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>{anchor}</span>
                    <span className="text-[13px] leading-snug text-ink-soft">{current.anchors[anchor]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6"><div className="flex items-baseline justify-between"><p className="font-mono text-[10px] uppercase text-ink-soft">Your score</p><p className="font-display text-xl font-semibold text-primary">{currentScore || '–'} / 5</p></div>
                <div className="mt-2.5 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((score) => <Button key={score} type="button" aria-label={`Score ${score}`} variant={currentScore === score ? "scoreActive" : "score"} onClick={() => selectScore(score)}>{score}</Button>)}</div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <Button variant="instrument" disabled={!currentScore || (completed === 10 && activeIndex === 9)} onClick={continueObservation}>Save &amp; next metric <ChevronRight /></Button>
                {activeIndex > 0 && <Button variant="ghost" onClick={() => setActiveIndex((index) => index - 1)}><ChevronLeft /> Previous</Button>}
                {completed === 10 && <Button className="sm:ml-auto" onClick={submitEvaluation} disabled={saving}>{saving ? "Saving…" : "Complete evaluation"}<ClipboardCheck /></Button>}
              </div>
              {saveError && <p role="alert" className="mt-3 text-sm text-destructive">{saveError}</p>}
            </div>
          </section>

          <aside className="rise col-span-12 lg:col-span-3">
            <div className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl lg:min-h-full">
              <p className="font-mono text-[10px] uppercase text-ink-soft">Live calibration</p>
              <div className="mt-3 flex items-end gap-2"><p className="font-display text-4xl font-semibold leading-none text-amber">{projectedTotal || '–'}</p><p className="pb-1 font-mono text-[12px] text-ink-soft">/ 50 projected</p></div>
              {completed > 0 && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 ring-1 ring-amber/30"><span className="size-1.5 rounded-full bg-amber" /><span className="font-mono text-[10px] font-medium uppercase text-amber">{liveTier}</span></div>}
              <div className="mt-4 rounded-2xl border border-line bg-background/40 p-3.5"><p className="font-mono text-[10px] uppercase text-ink-soft">Evidence rule</p><p className="mt-1 text-[13px] leading-snug">Score the behavior you saw—not intent, reputation, or presentation style.</p></div>
              {completed > 0 && <div className="mt-3 rounded-2xl border border-line bg-background/40 p-3.5"><p className="font-mono text-[10px] uppercase text-ink-soft">Current focus</p><p className="mt-1 text-[13px] font-medium">{lowestCurrent.name}</p><p className="mt-1 text-[12px] leading-snug text-ink-soft">This will shape the final coaching script.</p></div>}
            </div>
          </aside>
        </main>
      )}

      {stage === "result" && savedResult && (
        <main className="mx-auto max-w-6xl px-5 py-8">
          <div className="rise flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6"><div><p className="font-mono text-[10px] uppercase text-primary">Evaluation saved</p><h1 className="mt-2 font-display text-4xl font-semibold">A clear decision, with a next step.</h1><p className="mt-2 text-ink-soft">{teacherName} · {classSubject}</p></div><Button variant="outline" onClick={reset}><RotateCcw /> New observation</Button></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-[26px] border border-line bg-card p-6 backdrop-blur-xl"><p className="font-mono text-[10px] uppercase text-ink-soft">Final result</p><div className="mt-4 flex items-end gap-3"><p className="font-display text-6xl font-semibold text-primary">{savedResult.total}</p><p className="pb-2 font-mono text-sm text-ink-soft">/ 50 points</p></div><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"><Check className="size-4" />{savedResult.tier}</div><div className="mt-6 border-t border-line pt-5"><p className="font-mono text-[10px] uppercase text-ink-soft">{mode === 'recruitment' ? 'Hiring verdict' : 'Growth pathway'}</p><p className="mt-2 font-display text-2xl font-semibold">{savedResult.verdict}</p></div></section>
            <section className="rounded-[26px] border border-line bg-card p-6 backdrop-blur-xl"><p className="font-mono text-[10px] uppercase text-primary">Priority coaching focus</p><h2 className="mt-2 font-display text-3xl font-semibold">{savedResult.focus.name}</h2><p className="mt-2 text-sm text-ink-soft">Lowest observed metric. Improve one visible behavior before adding complexity.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[
              ['Ask', `“How did you decide whether every student understood ${savedResult.focus.name.toLowerCase()} today?”`],
              ['Describe', `“I observed a score of ${Math.min(...scores)} here. The visible gap was: ${savedResult.focus.anchors[1]}”`],
              ['Ask', `“What would change if you tried this next lesson: ${savedResult.action ?? savedResult.focus.action}”`]
            ].map(([label, text], index) => <div key={`${label}-${index}`} className="rounded-2xl border border-line bg-background/45 p-4"><p className="font-mono text-[10px] font-medium uppercase text-primary">{label}</p><p className="mt-2 text-[13px] leading-relaxed">{text}</p></div>)}</div></section>
          </div>
          <section className="mt-5 rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase text-ink-soft">Behavior profile</p><p className="mt-1 text-sm text-ink-soft">All ten evidence points remain visible for a defensible conversation.</p></div><p className="font-mono text-[10px] text-ink-soft">Record {savedResult.id?.slice(0, 8)}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map((metric, index) => { const score = scores[index] ?? 0; return <div key={metric.name} className="rounded-xl border border-line bg-background/45 p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-medium">{metric.shortName}</p><span className="font-display text-lg font-semibold">{score}</span></div><div className="mt-2 h-1.5 rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary" style={{ width: `${score * 20}%` }} /></div></div>; })}</div></section>
        </main>
      )}
    </div>
  );
}
