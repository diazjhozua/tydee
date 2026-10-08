export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isAdmin: boolean;
  isLocked: boolean;
};

export type AdminStats = {
  users: number;
  verifiedUsers: number;
  accounts: number;
  expenses: number;
  openSuggestions: number;
};