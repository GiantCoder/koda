import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface VideoState {
  uploadProgress: number;
}

const initialState: VideoState = {
  uploadProgress: 0,
};

const videoSlice = createSlice({
  name: "video",
  initialState,
  reducers: {
    setUploadProgress(state, action: PayloadAction<number>) {
      state.uploadProgress = action.payload;
    },
  },
});

export const { setUploadProgress } = videoSlice.actions;
export default videoSlice.reducer;
