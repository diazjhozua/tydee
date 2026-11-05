import { PASSWORD } from "../support/env";
import { uniqueEmail } from "../support/time";

export type UserSpec = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

export function userSpec(overrides: Partial<UserSpec> = {}): UserSpec {
  return {
    email: uniqueEmail(),
    password: PASSWORD,
    confirmPassword: PASSWORD,
    firstName: "E2E",
    lastName: "Tester",
    ...overrides,
  };
}
