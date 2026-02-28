/**
 * Mock messaging data for MVP when backend is unavailable.
 */

export type ConversationRole = "parent" | "player" | "coach";

export interface MockConversation {
  id: string;
  participantName: string;
  participantRole: ConversationRole;
  participantContext?: string; // e.g. "Re: Jake Thompson", "U-14", "18"
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  isUnder18?: boolean;
  parentName?: string; // For under-18 players: parent/guardian name for visibility footer
}

export interface MockMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  isCurrentUser: boolean;
}

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: "conv-1",
    participantName: "Michael Thompson",
    participantRole: "parent",
    participantContext: "Re: Jake Thompson (U-14)",
    lastMessagePreview: "Thanks for the update on Jake's progress. When is the next session?",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unreadCount: 2,
    isUnder18: true,
    parentName: "Michael Thompson",
  },
  {
    id: "conv-2",
    participantName: "Emma Williams",
    participantRole: "parent",
    participantContext: "Re: Sophie Williams",
    lastMessagePreview: "Can we schedule a call to discuss the training plan?",
    lastMessageAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
  },
  {
    id: "conv-3",
    participantName: "Lucas Martinez",
    participantRole: "player",
    participantContext: "Player (18)",
    lastMessagePreview: "Got it, I'll bring my kit to the session.",
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
    isUnder18: true,
    parentName: "Maria Martinez",
  },
];

export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  "conv-1": [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "other",
      senderName: "Michael Thompson",
      content: "Hi Sarah, I wanted to check in on Jake's progress after last week's session.",
      sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isCurrentUser: false,
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "current",
      senderName: "Sarah Johnson",
      content: "Hi Michael! Jake did really well. His cover drive has improved significantly. I've added some notes to his profile.",
      sentAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      isCurrentUser: true,
    },
    {
      id: "msg-3",
      conversationId: "conv-1",
      senderId: "other",
      senderName: "Michael Thompson",
      content: "Thanks for the update on Jake's progress. When is the next session?",
      sentAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      isCurrentUser: false,
    },
  ],
  "conv-2": [
    {
      id: "msg-4",
      conversationId: "conv-2",
      senderId: "other",
      senderName: "Emma Williams",
      content: "Can we schedule a call to discuss the training plan?",
      sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      isCurrentUser: false,
    },
  ],
  "conv-3": [
    {
      id: "msg-5",
      conversationId: "conv-3",
      senderId: "current",
      senderName: "Sarah Johnson",
      content: "Hi Lucas, don't forget to bring your kit to tomorrow's session.",
      sentAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      isCurrentUser: true,
    },
    {
      id: "msg-6",
      conversationId: "conv-3",
      senderId: "other",
      senderName: "Lucas Martinez",
      content: "Got it, I'll bring my kit to the session.",
      sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isCurrentUser: false,
    },
  ],
};

export const QUICK_REPLY_CHIPS = [
  "Training confirmed",
  "Schedule update",
  "Equipment needed",
  "Great progress",
];
