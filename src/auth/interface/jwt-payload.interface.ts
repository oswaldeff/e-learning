export interface JWTPayload {
  userId: number;
  role: string;
  isRefreshToken: boolean;
}
