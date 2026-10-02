export interface DocuFlowUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const USERS_KEY = "docuflow_users";
const SESSION_KEY = "docuflow_session";

interface StoredUser extends DocuFlowUser {
  password: string;
}

function getUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(
  name: string,
  email: string,
  password: string
): { success: boolean; message: string; user?: DocuFlowUser } {
  const users = getUsers();

  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((user) => user.email === normalizedEmail)) {
    return {
      success: false,
      message: "An account with this email already exists.",
    };
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password,
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

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  return {
    success: true,
    message: "Account created successfully.",
    user: sessionUser,
  };
}

export function loginUser(
  email: string,
  password: string
): { success: boolean; message: string; user?: DocuFlowUser } {
  const users = getUsers();

  const user = users.find(
    (item) =>
      item.email === email.trim().toLowerCase() &&
      item.password === password
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

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  return {
    success: true,
    message: "Login successful.",
    user: sessionUser,
  };
}

export function getCurrentUser(): DocuFlowUser | null {
  if (typeof window === "undefined") return null;

  try {
    const session = localStorage.getItem(SESSION_KEY);

    if (!session) return null;

    return JSON.parse(session) as DocuFlowUser;
  } catch {
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