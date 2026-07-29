export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
};

export type ValidationProblemDetails = ProblemDetails & {
  errors: { code: string; description: string; type: number }[];
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails | ValidationProblemDetails,
  ) {
    super(problem.detail ?? problem.title ?? "Request failed");
    this.name = "ApiError";
  }

  isValidation(): this is ApiError & { problem: ValidationProblemDetails } {
    return "errors" in this.problem && Array.isArray(this.problem.errors);
  }

  get title(): string | undefined {
    return this.problem.title;
  }

  /** User-facing message: first validation description, else detail/title. */
  get displayMessage(): string {
    if (this.isValidation() && this.problem.errors.length > 0) {
      return this.problem.errors[0].description;
    }
    return this.problem.detail ?? this.problem.title ?? "Something went wrong.";
  }
}
