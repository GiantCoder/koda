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

/** Build a short coaching paragraph from bowling biomechanical scores. */
export function buildBowlingCoachingFeedbackFromScores(
  deliveryLabel: string,
  scores: {
    runUpRhythm: number;
    bowlingArmAction: number;
    releasePoint: number;
    balance: number;
  }
): string {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (scores.runUpRhythm >= 80) {
    strengths.push("smooth run-up rhythm");
  } else if (scores.runUpRhythm < 70) {
    improvements.push("focus on a steady, accelerating run-up into the crease");
  }

  if (scores.bowlingArmAction >= 80) {
    strengths.push("strong bowling-arm action");
  } else if (scores.bowlingArmAction < 70) {
    improvements.push("work on a higher, freer bowling-arm path through the release");
  }

  if (scores.releasePoint >= 80) {
    strengths.push("consistent release point");
  } else if (scores.releasePoint < 70) {
    improvements.push("aim to release the ball at a more consistent height and line");
  }

  if (scores.balance >= 80) {
    strengths.push("great balance through the delivery");
  } else if (scores.balance < 70) {
    improvements.push("work on landing balanced through the follow-through");
  }

  if (strengths.length > 0 && improvements.length > 0) {
    return `Your ${deliveryLabel} shows ${strengths.join(" and ")}. To improve further, ${improvements.join(" and ")}.`;
  }
  if (strengths.length > 0) {
    return `Excellent ${deliveryLabel}! You demonstrate ${strengths.join(" and ")}. Keep up the great work!`;
  }
  if (improvements.length > 0) {
    return `Good effort on your ${deliveryLabel}. Focus on: ${improvements.join(", ")}.`;
  }
  return `Keep building repetition on your ${deliveryLabel} — small adjustments add up quickly.`;
}
