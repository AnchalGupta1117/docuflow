"use client";

export interface DocuFlowUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const USERS_KEY = "docuflow_users";
const SESSION_KEY = "docuflow_session";

interface StoredUser extends DocuFlowUser {
  passwordHash: string;
}

function getUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(USERS_KEY);

    if (!stored) return [];

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{
  success: boolean;
  message: string;
  user?: DocuFlowUser;
}> {
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    return {
      success: false,
      message: "Please enter your name.",
    };
  }

  if (!normalizedEmail) {
    return {
      success: false,
      message: "Please enter your email.",
    };
  }

  if (!password) {
    return {
      success: false,
      message: "Please enter a password.",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: "Password must be at least 6 characters.",
    };
  }

  const users = getUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    return {
      success: false,
      message: "An account with this email already exists.",
    };
  }

  try {
    const passwordHash = await hashPassword(password);

    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);

    const sessionUser: DocuFlowUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(sessionUser)
    );

    return {
      success: true,
      message: "Account created successfully.",
      user: sessionUser,
    };
  } catch {
    return {
      success: false,
      message: "Unable to create your account. Please try again.",
    };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  message: string;
  user?: DocuFlowUser;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return {
      success: false,
      message: "Please enter your email and password.",
    };
  }

  try {
    const users = getUsers();
    const passwordHash = await hashPassword(password);

    const user = users.find(
      (item) =>
        item.email === normalizedEmail &&
        item.passwordHash === passwordHash
    );

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    const sessionUser: DocuFlowUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(sessionUser)
    );

    return {
      success: true,
      message: "Login successful.",
      user: sessionUser,
    };
  } catch {
    return {
      success: false,
      message: "Unable to sign in. Please try again.",
    };
  }
}

export function getCurrentUser(): DocuFlowUser | null {
  if (typeof window === "undefined") return null;

  try {
    const session = localStorage.getItem(SESSION_KEY);

    if (!session) return null;

    const parsed = JSON.parse(session);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string"
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed as DocuFlowUser;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function logoutUser() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}