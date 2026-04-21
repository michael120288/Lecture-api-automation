// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface ISignUpPayload {
  username: string;
  email: string;
  password: string;
  avatarColor: string;
  avatarImage: string; // base64 encoded image string
}

export interface ISignInPayload {
  username: string;
  password: string;
}

export interface IUserResponse {
  _id: string;
  authId: string;
  uId: string;
  username: string;
  email: string;
  avatarColor: string;
  profilePicture: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface ISignUpResponse {
  message: string;
  user: IUserResponse;
  token: string;
}

export interface ISignInResponse {
  message: string;
  user: IUserResponse;
  token: string;
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface IPostPayload {
  post: string;
  bgColor: string;
  privacy: string;
  feelings: string;
  gifUrl: string;
  profilePicture: string;
}

export interface IPostResponse {
  _id: string;
  userId: string;
  username: string;
  post: string;
  bgColor: string;
  privacy: string;
  feelings: string;
  gifUrl: string;
  profilePicture: string;
  createdAt: string;
  commentsCount: number;
  imgVersion: string;
  imgId: string;
  reactions: Record<string, number>;
}

// ─── Reaction ─────────────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'love' | 'wow' | 'sad' | 'angry' | 'happy';

export interface IReactionPayload {
  userTo: string;
  postId: string;
  type: ReactionType;
  previousReaction: string;
  postReactions: Record<string, number>;
  profilePicture: string;
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface ICommentPayload {
  userTo: string;
  postId: string;
  profilePicture: string;
  comment: string;
  username: string;
}

export interface ICommentResponse {
  _id: string;
  username: string;
  avatarColor: string;
  postId: string;
  profilePicture: string;
  comment: string;
  createdAt: string;
}

// ─── Test cleanup ─────────────────────────────────────────────────────────────

export interface ICleanupResponse {
  message: string;
  deletedAuthId: string;
  deletedUsername: string;
}
