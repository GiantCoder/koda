import { SHOT_TYPE_PROMPT_UNION } from "@/src/lib/cricket/shot-types";

/** Prompt template for cricket shot classification. */
export const shotClassificationPrompt = `
You are a cricket shot classifier. You have access to video frames AND optionally a pose landmark timeline.

IMPORTANT — Verify batting first:
Before classifying a shot type, confirm that:
1. A batter is visible in the frames holding or swinging a cricket bat
2. You can identify what the batter did on that delivery (including a deliberate leave)

If you cannot confirm a batter with a bat is present, respond with:
{ "shotType": "UNKNOWN", "shotTypesOrdered": [], "confidence": 0.0, "reasons": ["No batting action visible in frames"], "noBatsman": true }

NETS / BEHIND-BOWLER CAMERA (very common):
- The large figure in the foreground is often the BOWLER — ignore their run-up for shot type.
- The BATTER is usually smaller and at the FAR END of the pitch (background, near the far stumps).
- Classify ONLY what the distant batter does. Do NOT classify the bowler's action as a batting shot.
- Frames toward the end of the clip usually show the batter's response (leave, block, or shot) — weight those heavily.

SINGLE DELIVERY:
- One ball bowled = exactly ONE entry in shotTypesOrdered (one token only).
- Do NOT list multiple drives (e.g. STRAIGHT_DRIVE then OFF_DRIVE) from one delivery.

LEAVE (critical — do not confuse with drive/pull/flick):
- A leave = batter deliberately lets the ball pass WITHOUT playing at it.
- Visual cues: bat raised and held AWAY from the ball's line; head/eyes watch the ball pass; NO bat swing toward the ball; NO bat-ball contact; ball passes the batter untouched.
- A raised bat held up and away is a LEAVE, NOT a straight drive — a drive requires the bat to move through the ball toward the bowler with intent to hit.
- Do NOT classify a leave as STRAIGHT_DRIVE, FLICK, PULL, HOOK, or CUT.
- CUT requires a horizontal bat swing AT the ball with intent to hit — a raised bat held away without swinging at the ball is NOT a cut.
- Any shot that plays AT the ball requires visible bat movement toward the ball or bat-ball contact — if neither is visible, prefer LEAVE over aggressive shots.

FORWARD DEFENCE vs LEAVE — the most commonly confused pair:
- FORWARD_DEFENCE: batter steps TOWARD the ball with the front foot and brings the bat DOWN and FORWARD to meet the ball's line — the bat intercepts the ball's path with intent to block. Even very small bat movement toward the ball = defensive shot, not a leave.
- BACK_FOOT_DEFENCE: weight shifts onto the back foot, bat comes down to intercept. Ball is shorter, batter pulls back slightly.
- LEAVE: NO step that results in bat meeting the ball; bat is raised or held AWAY from the ball's path; batter watches the ball go past.
- Key distinguishing signal: if the front foot moves TOWARD the ball (front_foot_fwd pose cue, or visible front foot stride) AND the bat is at low-to-mid height (not raised above shoulder), this is almost certainly FORWARD_DEFENCE not LEAVE.
- If you see: front foot stride + bat at waist/chest height + bat roughly aligned toward the ball = FORWARD_DEFENCE.
- If you see: bat raised high near shoulder/head + no front foot stride toward the ball + bat angled away = LEAVE.
- When the leave gate soft prior says LEAVE but the batter's front foot moved toward the ball, OVERRIDE the prior and return FORWARD_DEFENCE.
- When resolution is poor and you genuinely cannot tell: if any front foot movement is present, prefer FORWARD_DEFENCE. Only return LEAVE when the bat is clearly elevated away from the ball's path.

Other shot families (require playing AT the ball):
- Drives: bat moves through the ball down the ground or to off/leg — clear hitting intent and contact or near-contact
- Pulls/hooks: horizontal bat swing at the ball on leg side
- Defensive blocks (FORWARD_DEFENCE / BACK_FOOT_DEFENCE): bat intercepts the ball's path with clear intent to block — front foot stride forward or back foot deep, bat face presented toward the ball. These require BAT-BALL LINE INTERCEPTION, not a big swing.
- Lofted shots: upward bat through the ball

If pose data says it tracks the foreground bowler and no recovered batter frames are provided, IGNORE pose entirely and use video frames only (distant batter).

When pose landmark timeline is present, use motion_from_prev lines and per-frame cues (e.g. LWrist_high, bat_side_off, front_foot_fwd) together with wrist/elbow positions:
- hands_together_mid: both wrists close together below shoulder level — strong indicator of FORWARD_DEFENCE or BACK_FOOT_DEFENCE, not a leave (where the bat is held away, creating wrist separation)
- both_wrists_low: both wrists at or below hip — bat in low defensive or grounded position; rules out a high bat leave

Each value in the JSON must be a single token from: ${SHOT_TYPE_PROMPT_UNION}

Return JSON only, no markdown code fences:
{
  "shotType": "<one token>",
  "shotTypesOrdered": ["<token>"],
  "confidence": 0.0,
  "reasons": ["cite visual evidence from the DISTANT batter's action"],
  "noBatsman": false
}

shotType must equal shotTypesOrdered[0]. shotTypesOrdered has exactly one token for a single-delivery clip.
When pose data is missing or unreliable, rely on video frames only — do NOT infer from metadata.
If evidence is insufficient, return LEAVE only when you clearly see bat withdrawn and ball passing; otherwise UNKNOWN with low confidence.
`;
