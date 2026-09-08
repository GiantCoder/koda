"use client";

import React from "react";
import {
  ReprocessActivityButton,
  shouldOfferReprocessAsBatting,
  shouldOfferReprocessAsBowling,
  type ReprocessActivity,
} from "./ReprocessActivityButton";
import type { MockUser } from "@/app/lib/mock-auth";

/** @deprecated Prefer ReprocessActivityButton with forceActivity="BATTING". */
export function ReprocessAsBattingButton(props: {
  analysisId: string;
  user: MockUser | null;
  className?: string;
}) {
  return <ReprocessActivityButton {...props} forceActivity="BATTING" />;
}

export {
  ReprocessActivityButton,
  shouldOfferReprocessAsBatting,
  shouldOfferReprocessAsBowling,
  type ReprocessActivity,
};
