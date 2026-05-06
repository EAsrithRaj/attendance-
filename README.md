# Attendance

Most attendance trackers tell you your percentage. This one tells you whether you can afford to sleep in on Thursday.

It started as a frustration with apps that would say "you're at 74%" without answering the actual question: *how many more classes can I miss before I'm in trouble, and which ones?* The answer turns out to be non-trivial once you factor in weighted labs, per-subject minimums, and the compounding effect of future classes on your current buffer.

So this is that answer — built properly.

---

## What it actually does

**Tracks weighted attendance.** Labs count for 3 units, lectures for 1. A percentage calculated from raw class counts is meaningless when a single lab skip costs as much as three lectures.

**Runs a constraint system, not just math.** A skip is only flagged safe when *both* conditions hold: the affected subject stays above its minimum threshold, and your overall weighted attendance stays above the timetable-wide minimum. One lock failing kills the recommendation. This prevents the subtle bug where a subject-level "safe" skip quietly tanks your overall percentage.

**Gives you a bunk budget.** Not a vague "you're doing okay." A number. How many units you can drop, and which subject is the bottleneck.

**Simulates forward.** Pick a date range, tell it you plan to skip certain classes, and it projects where you'll land. Useful for exam seasons when you know you'll miss a week and want to know if that's survivable.

**Finds the optimal skip schedule.** The planner runs a greedy pass first (fast, good-enough), then kicks off a branch-and-bound search in a Web Worker to find the actual optimum — distinguishing between high-cost lab skips and cheap lecture skips and weighting accordingly. The UI never blocks.

**Handles real-world mismatch.** College portals and reality often disagree. You can anchor subjects to portal-reported totals and apply percentage offsets. Everything downstream updates immediately.

---

## How the optimizer works

The naive approach to "find the best set of classes to skip" is to enumerate combinations — which is `O(N × 2^N)` once you account for re-simulating state at each branch. That gets expensive fast.

Instead, the engine propagates incremental state snapshots through the decision tree. Each DFS branch carries a diff from its parent rather than recomputing from scratch, bringing the effective complexity down to `O(2^N)`. Suffix-bound heuristics prune branches that can't beat the current best plan, so in practice it terminates well before the worst case.

If the solver can't *prove* a skip is safe, it doesn't guess. The default is: don't skip.

---

## Stack

React + TypeScript, Vite, TailwindCSS, shadcn/ui. The optimizer runs in a Web Worker so the planner UI stays interactive during search.

---

## Roadmap

Things that are built and working: tracking, weighted calculations, constraint validation, skip optimization, forward simulation, manual reconciliation.

Things that aren't yet: progressive streaming for optimization results as they come in, simulation caching across sessions, QR-based timetable sharing, calendar sync, semester-level analytics.

---

## Disclaimer

This is a planning tool. Your institution's portal is the source of truth — faculty corrections, portal sync delays, and policy edge cases all exist outside this system. Verify before making any decision that matters.

---

## Why

Attendance is a constrained optimization problem. It just usually gets treated like a dashboard metric. The difference matters when you're two weeks from finals and trying to figure out if you can afford to actually study instead of showing up.
