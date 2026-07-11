import "server-only";

export type ErrorType =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "BUSINESS_RULE"
  | "INFRASTRUCTURE"
  | "UNEXPECTED";

export abstract class AppError extends Error {
  abstract readonly type: ErrorType;
  abstract readonly statusCode: number;
  readonly isOperational: boolean = true;

  constructor(message: string, readonly safeMessage: string = message) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  readonly type = "VALIDATION";
  readonly statusCode = 400;

  constructor(message: string, safeMessage: string = "Validation failed. Please check your inputs.") {
    super(message, safeMessage);
  }
}

export class AuthenticationError extends AppError {
  readonly type = "AUTHENTICATION";
  readonly statusCode = 401;

  constructor(message: string, safeMessage: string = "You must be authenticated to perform this action.") {
    super(message, safeMessage);
  }
}

export class AuthorizationError extends AppError {
  readonly type = "AUTHORIZATION";
  readonly statusCode = 403;

  constructor(message: string, safeMessage: string = "You do not have permission to access this resource.") {
    super(message, safeMessage);
  }
}

export class BusinessRuleError extends AppError {
  readonly type = "BUSINESS_RULE";
  readonly statusCode = 422;

  constructor(message: string, safeMessage: string = message) {
    super(message, safeMessage);
  }
}

export class InfrastructureError extends AppError {
  readonly type = "INFRASTRUCTURE";
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message: string, safeMessage: string = "An error occurred with our systems. Please try again later.") {
    super(message, safeMessage);
  }
}

export class UnexpectedError extends AppError {
  readonly type = "UNEXPECTED";
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message: string, safeMessage: string = "An unexpected error occurred. Please try again later.") {
    super(message, safeMessage);
  }
}

/**
 * Normalizes any caught exception into an AppError instance for safe logging and client response.
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  
  // Return an unexpected error wrapper
  return new UnexpectedError(message);
}
