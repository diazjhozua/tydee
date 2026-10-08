export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};
