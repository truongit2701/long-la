import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username cần ít nhất 3 ký tự")
    .max(32, "Username tối đa 32 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ gồm chữ, số và dấu gạch dưới")
    .toLowerCase(),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(128),
});

export const loginSchema = registerSchema.pick({
  username: true,
  password: true,
});
