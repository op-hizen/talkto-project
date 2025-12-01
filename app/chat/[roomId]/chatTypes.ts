// app/chat/[roomId]/chatTypes.ts

export type Author = {
  id: string;
  username: string | null;
  image: string | null;
  role: string | null;
};

export type ReplyTo = {
  id: string;
  content: string;
  author: {
    id: string;
    username: string | null;
  };
};

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  isEdited: boolean;
  deletedAt: string | null;
  author: Author;
  replyTo: ReplyTo | null;
};

export type MentionUser = {
  id: string;
  username: string;
};

export type ToastState =
  | {
      id: string;
      messageId: string;
      authorName: string | null;
      preview: string;
    }
  | null;

export type ChatRoomHandle = {
  hasMessage: (id: string) => boolean;
  mergeMessages: (msgs: Message[]) => void;
  jumpToMessage: (id: string) => void;
};

export type Props = {
  roomId: string;
  roomSlug: string;
  roomName: string;
  currentUserId: string;
  currentUsername: string;
  initialMessages: Message[];
  onUserClick?: (userId: string) => void;

  initialCursor?: string | null;
  initialLastReadAt?: string | null;
};
