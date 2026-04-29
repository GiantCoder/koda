/** Build a short coaching paragraph from biomechanical scores (matches prior shadow-batting UX). */
export function buildCoachingFeedbackFromScores(
  shotTypeLabel: string,
  scores: {
    weightTransfer: number;
    balance: number;
    timing: number;
  }
): string {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (scores.weightTransfer >= 80) {
    strengths.push("excellent weight transfer");
  } else if (scores.weightTransfer < 70) {
    improvements.push("focus on transferring your weight through the shot");
  }

  if (scores.balance >= 80) {
    strengths.push("great balance throughout");
  } else if (scores.balance < 70) {
    improvements.push("work on maintaining balance at impact");
  }

  if (scores.timing >= 80) {
    strengths.push("good timing");
  } else if (scores.timing < 70) {
    improvements.push("practice timing with a ball on a string");
  }

  if (strengths.length > 0 && improvements.length > 0) {
    return `Your ${shotTypeLabel} shows ${strengths.join(" and ")}. To improve further, ${improvements.join(" and ")}.`;
  }
  if (strengths.length > 0) {
    return `Excellent ${shotTypeLabel}! You demonstrate ${strengths.join(" and ")}. Keep up the great work!`;
  }
  if (improvements.length > 0) {
    return `Good effort on your ${shotTypeLabel}. Focus on: ${improvements.join(", ")}.`;
  }
  return `Keep building repetition on your ${shotTypeLabel} — small adjustments add up quickly.`;
}

export function shotTypeToLabel(shotType: string): string {
  return String(shotType)
    .replace(/_/g, " ")
    .toLowerCase();
}
