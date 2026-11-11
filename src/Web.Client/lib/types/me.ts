export type DefaultPage = "Home" | "LogExpense";

export type Me = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  currency: string;
  isAdmin: boolean;
  defaultPage: DefaultPage | null;
};
