import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 8;

function randomInviteCodeBody(length: number) {
  const bytes = randomBytes(length);
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += INVITE_ALPHABET[bytes[index] % INVITE_ALPHABET.length];
  }
  return output;
}

export async function generateUniqueInviteCodeTx(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `MCG${randomInviteCodeBody(INVITE_CODE_LENGTH)}`;
    const existing = await tx.user.findUnique({ where: { inviteCode: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }

  throw new Error("Unable to generate a unique invite code");
}

export async function registerUserInviteTx(tx: Prisma.TransactionClient, params: {
  inviteCode: string;
  inviteeUserId: string;
}) {
  const normalizedCode = String(params.inviteCode ?? "").trim().toUpperCase();
  if (!normalizedCode) return null;

  const [inviter, existingInvite] = await Promise.all([
    tx.user.findUnique({ where: { inviteCode: normalizedCode }, select: { id: true } }),
    tx.userInvite.findUnique({ where: { inviteeId: params.inviteeUserId }, select: { id: true } }),
  ]);

  if (!inviter || inviter.id === params.inviteeUserId || existingInvite) return null;

  return tx.userInvite.create({
    data: {
      inviterId: inviter.id,
      inviteeId: params.inviteeUserId,
      inviteCode: normalizedCode,
    },
  });
}
