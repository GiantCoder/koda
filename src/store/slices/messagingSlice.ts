import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ConversationPreview {
  id: string;
  title: string;
}

interface MessagingState {
  conversations: ConversationPreview[];
}

const initialState: MessagingState = {
  conversations: [],
};

const messagingSlice = createSlice({
  name: "messaging",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<ConversationPreview[]>) {
      state.conversations = action.payload;
    },
  },
});

export const { setConversations } = messagingSlice.actions;
export default messagingSlice.reducer;
