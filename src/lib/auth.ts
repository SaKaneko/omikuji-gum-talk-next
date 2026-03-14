import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production"
);

const COOKIE_NAME = "auth-token";
const TOKEN_EXPIRY = "24h";

export interface JWTPayload {
  userId: string;
  name: string;
  displayName: string;
  roleName: string;
}

export interface SessionUser {
  id: string;
  name: string;
  displayName: string;
  roleName: string;
  permissions: string[];
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export function verifyPassword(
  password: string,
  salt: string,
  hash: string
): boolean {
  const computedHash = hashPassword(password, salt);
  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Fetch fresh permissions from DB
  const user = await prisma.user.findUnique({
    where: { id: payload.userId, deletedAt: null },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const permissions = user.role.rolePermissions.map(
    (rp) => rp.permission.slug
  );

  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    roleName: user.role.name,
    permissions,
  };
}

export function hasPermission(
  user: SessionUser | null,
  permission: string
): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}
