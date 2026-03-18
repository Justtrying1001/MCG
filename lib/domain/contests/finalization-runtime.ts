import { ContestStatus } from "@prisma/client";

import { computeContestScoresFromSnapshots } from "@/lib/domain/contests/scoring-engine-runtime";
import { executeAutoSettlementForContest } from "@/lib/domain/contests/settlement-plan-runtime";
import { captureEndSnapshot } from "@/lib/domain/contests/snapshot-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

type PipelineStep = "END_SNAPSHOT" | "SCORING" | "RANKING" | "SETTLEMENT";

type ContestPipelineCounts = {
  entries: number;
  rosterLocks: number;
  endSnapshots: number;
  tokenScores: number;
  breakdownRows: number;
  scores: number;
  rankings: number;
  settlements: number;
};

export type ContestFinalizationResult = {
  contestId: string;
  stepsExecuted: PipelineStep[];
  stepsSkipped: PipelineStep[];
  counts: ContestPipelineCounts;
};

function isScoringComplete(counts: ContestPipelineCounts) {
  if (counts.entries === 0) return counts.tokenScores > 0 || counts.endSnapshots > 0;
  return counts.tokenScores > 0 && counts.scores >= counts.entries && counts.breakdownRows >= counts.rosterLocks;
}

function isRankingComplete(counts: ContestPipelineCounts) {
  if (counts.entries === 0) return true;
  return counts.rankings >= counts.scores && counts.rankings > 0;
}

async function loadPipelineCounts(contestId: string): Promise<{ status: ContestStatus; counts: ContestPipelineCounts }> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId }, select: { id: true, status: true } });
  if (!contest) throw new ContestRuntimeError("Contest not found", 404);

  const [entries, rosterLocks, endSnapshots, tokenScores, breakdownRows, scores, rankings, settlements] = await Promise.all([
    prisma.contestEntry.count({ where: { contestId } }),
    prisma.rosterLock.count({ where: { contestEntry: { contestId } } }),
    prisma.contestTokenSnapshot.count({ where: { contestId, phase: "END" } }),
    prisma.contestTokenScore.count({ where: { contestId } }),
    prisma.contestEntryScoreBreakdown.count({ where: { entry: { contestId } } }),
    prisma.contestScore.count({ where: { contestId } }),
    prisma.contestRanking.count({ where: { contestId } }),
    prisma.contestSettlement.count({ where: { contestId } }),
  ]);

  return {
    status: contest.status,
    counts: { entries, rosterLocks, endSnapshots, tokenScores, breakdownRows, scores, rankings, settlements },
  };
}

function toStepError(step: PipelineStep, error: unknown): ContestRuntimeError {
  if (error instanceof ContestRuntimeError) {
    return new ContestRuntimeError(`[${step}] ${error.message}`, error.status);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ContestRuntimeError(`[${step}] ${message}`, 500);
}

export async function finalizeContestFromEndSnapshotTrigger(contestId: string): Promise<ContestFinalizationResult> {
  const stepsExecuted: PipelineStep[] = [];
  const stepsSkipped: PipelineStep[] = [];

  let state = await loadPipelineCounts(contestId);

  if (state.counts.endSnapshots === 0) {
    try {
      await captureEndSnapshot(contestId);
      stepsExecuted.push("END_SNAPSHOT");
    } catch (error) {
      throw toStepError("END_SNAPSHOT", error);
    }
  } else {
    stepsSkipped.push("END_SNAPSHOT");
  }

  state = await loadPipelineCounts(contestId);

  const needsScoring = !isScoringComplete(state.counts) || !isRankingComplete(state.counts);
  if (needsScoring) {
    if (state.status === ContestStatus.SETTLED) {
      throw new ContestRuntimeError("[SCORING] Contest is already SETTLED and scoring/ranking data is incomplete", 409);
    }
    try {
      await computeContestScoresFromSnapshots(contestId);
      stepsExecuted.push("SCORING");
      if (state.counts.rankings === 0) stepsExecuted.push("RANKING");
    } catch (error) {
      throw toStepError(state.counts.rankings === 0 ? "RANKING" : "SCORING", error);
    }
  } else {
    stepsSkipped.push("SCORING", "RANKING");
  }

  state = await loadPipelineCounts(contestId);
  if (!isScoringComplete(state.counts)) {
    throw new ContestRuntimeError(
      `[SCORING] Scoring is incomplete after compute (scores=${state.counts.scores}, breakdownRows=${state.counts.breakdownRows}, tokenScores=${state.counts.tokenScores})`,
      409
    );
  }

  if (!isRankingComplete(state.counts)) {
    throw new ContestRuntimeError(`[RANKING] Ranking rows are incomplete after compute (rankings=${state.counts.rankings}, scores=${state.counts.scores})`, 409);
  }

  if (state.counts.settlements === 0) {
    try {
      await executeAutoSettlementForContest(contestId, { finalizeContestStatus: false });
      stepsExecuted.push("SETTLEMENT");
    } catch (error) {
      throw toStepError("SETTLEMENT", error);
    }
  } else {
    stepsSkipped.push("SETTLEMENT");
  }

  const finalState = await loadPipelineCounts(contestId);

  return {
    contestId,
    stepsExecuted,
    stepsSkipped,
    counts: finalState.counts,
  };
}

export function deriveContestProgressFromCounts(counts: {
  entries: number;
  tokenScores: number;
  breakdownRows: number;
  scores: number;
  rankings: number;
  settlements: number;
}) {
  const rankingGenerated = counts.rankings > 0 && counts.rankings >= counts.scores;
  const settlementDone = counts.settlements > 0;
  const scoringReady = counts.entries === 0
    ? counts.tokenScores > 0 || counts.scores === 0
    : counts.tokenScores > 0 && counts.scores >= counts.entries && (counts.breakdownRows > 0 || rankingGenerated || settlementDone);

  return {
    entries: counts.entries,
    scoringReady,
    rankingGenerated,
    settlementDone,
  };
}
