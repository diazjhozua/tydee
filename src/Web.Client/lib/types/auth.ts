export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type RegisterRequest = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

// The BFF strips the verification secret from register and resend answers; it lives in the email_verification cookie.
export type RegisterResponse = {
  message: string;
};

// hasPassword is false when the registration password was dropped (the account was verified from another browser).
export type VerifyEmailResult = {
  hasPassword: boolean;
};

export type ResendVerificationResponse = {
  message: string;
};
