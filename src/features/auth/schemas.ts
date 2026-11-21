import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(3, "Enter an email address.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

const fullName = z
  .string()
  .trim()
  .min(2, "Enter your name.")
  .max(80, "Name is too long.");

export const signInSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(72, "Use 72 characters or fewer."),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    fullName,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
