"use client";

import { useState, useEffect } from "react";
import { getMockUser, setMockUser, type MockUser, type UserRole } from "@/app/lib/mock-auth";

export function useMockAuth(): {
  user: MockUser | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  updateUser: (updates: Partial<MockUser>) => void;
} {
  const [user, setUser] = useState<MockUser | null>(null);

  useEffect(() => {
    setUser(getMockUser());
  }, []);

  const setRole = (role: UserRole) => {
    setMockUser(role);
    setUser(getMockUser());
  };

  const updateUser = (updates: Partial<MockUser>) => {
    setMockUser(updates);
    setUser(getMockUser());
  };

  return {
    user,
    role: user?.role ?? "coach",
    setRole,
    updateUser,
  };
}
