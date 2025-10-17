// Strong password policy utilities
// Requirements: min 8 chars, at least one uppercase, one lowercase, and one digit

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, message: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must include at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must include at least one number" };
  }
  // No special character required

  return { valid: true };
}

export const PASSWORD_POLICY_HINT =
  "Use at least 8 characters with uppercase, lowercase, and a number.";
