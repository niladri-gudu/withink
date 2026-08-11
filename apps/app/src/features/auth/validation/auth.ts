import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Identity required").email("Invalid structure"),
  password: z.string().min(1, "Secret Key required"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Identity.Name required").trim(),
  email: z.string().min(1, "Secure.Email required").email("Invalid structure"),
  password: z.string().min(8, "8+ characters needed"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Identity required").email("Invalid structure"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "8+ characters needed"),
    confirmPassword: z.string().min(1, "Secret confirmation required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Keys do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
