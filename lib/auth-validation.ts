import { z } from "zod";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 72;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const credentialsSchema = z.object({
  username: z.string().trim().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH).regex(USERNAME_REGEX),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export const credentialsFormatMessage = `Username: ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} chars (letters, numbers, underscore). Password: ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} chars.`;
