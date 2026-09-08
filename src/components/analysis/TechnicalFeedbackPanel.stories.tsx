import type { Meta, StoryObj } from "@storybook/react";
import TechnicalFeedbackPanel from "./TechnicalFeedbackPanel";
import type { TechniqueFeedbackItem } from "@/src/types/technical-feedback";

const fixture: TechniqueFeedbackItem[] = [
  {
    dimension: "runUpRhythm",
    score: 86,
    diagnosis:
      "At t=0.42s the stride length stays even into the gather — rhythm looks controlled rather than rushed.",
    timestampSeconds: 0.42,
    evidence: "ankle spacing across early frames",
    drill: "Mark three run-up checkpoints and accelerate only after the second.",
    confidence: "high",
  },
  {
    dimension: "loadUp",
    score: 72,
    diagnosis:
      "At t=0.90s the bowling-arm elbow sits below shoulder height while the front knee is still soft — load is a touch late.",
    timestampSeconds: 0.9,
    evidence: "rightElbow / leftKnee at gather",
    drill: "Pause at gather with the bowling elbow above the shoulder line before driving.",
    confidence: "medium",
  },
  {
    dimension: "bowlingArmAction",
    score: 64,
    diagnosis:
      "At t=1.18s (front-foot plant) the bowling arm is still below shoulder height — release lands early and the ball can float full.",
    timestampSeconds: 1.18,
    evidence: "rightWrist below rightShoulder",
    drill: "Shadow-bowl focusing on delaying release until the arm is vertical past the head.",
    confidence: "high",
  },
  {
    dimension: "deliveryStride",
    score: 78,
    diagnosis: "Front-foot plant looks stable; stride length is appropriate for a good-length pace delivery.",
    timestampSeconds: 1.1,
    evidence: "leftAnkle plant frame",
    drill: "Film side-on and check plant lands under the front hip, not collapsed.",
    confidence: "medium",
  },
  {
    dimension: "releasePoint",
    score: 58,
    diagnosis:
      "Release appears early relative to the vertical arm — a cue also visible in the still near front-foot plant.",
    timestampSeconds: 1.22,
    evidence: "wrist height at release window",
    drill: "Use a high-release cue: brush the ear with the bowling hand before letting go.",
    confidence: "high",
  },
  {
    dimension: "followThrough",
    score: 81,
    diagnosis: "Follow-through continues across the body with the bowling shoulder rotating through the target.",
    timestampSeconds: 1.45,
    evidence: "shoulder line after release",
    drill: "Finish with the bowling hand past the opposite hip on every repetition.",
    confidence: "medium",
  },
  {
    dimension: "alignment",
    score: 70,
    diagnosis:
      "Alignment is only moderately clear from available landmarks — hips and shoulders look roughly toward the target but confidence is limited.",
    timestampSeconds: null,
    evidence: "incomplete hip/shoulder pair",
    drill: "Place a target stump and check your landing foot points at it each ball.",
    confidence: "low",
  },
  {
    dimension: "balance",
    score: 84,
    diagnosis: "At t=1.50s the finish stays upright over a braced front leg — balance through the crease looks solid.",
    timestampSeconds: 1.5,
    evidence: "nose over leftAnkle at finish",
    drill: "Hold the finish for two seconds after each delivery in nets.",
    confidence: "high",
  },
];

const meta: Meta<typeof TechnicalFeedbackPanel> = {
  title: "Analysis/TechnicalFeedbackPanel",
  component: TechnicalFeedbackPanel,
  args: {
    items: fixture,
    analysisId: null,
  },
};

export default meta;
type Story = StoryObj<typeof TechnicalFeedbackPanel>;

export const MixedConfidence: Story = {};

export const LongDiagnosis: Story = {
  args: {
    items: fixture.map((item, index) =>
      index === 2
        ? {
            ...item,
            diagnosis:
              "At t=1.18s (front-foot plant), your bowling arm is still below shoulder height — release lands early, sending the ball high and resulting in a full toss. Aim to delay release until the arm is vertical, just past the head, while keeping the front side braced so the energy travels down the pitch rather than leaking upward.",
          }
        : item
    ),
  },
};

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
};
