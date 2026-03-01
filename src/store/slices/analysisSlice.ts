import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AnalysisState {
  stage: string;
  progress: number;
}

const initialState: AnalysisState = {
  stage: "QUEUED",
  progress: 0,
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    setAnalysisState(state, action: PayloadAction<AnalysisState>) {
      state.stage = action.payload.stage;
      state.progress = action.payload.progress;
    },
  },
});

export const { setAnalysisState } = analysisSlice.actions;
export default analysisSlice.reducer;
