import { createContext, useContext, useState } from "react";

export interface User {
  uid: string;
  displayName?: string;
}

const DEFAULT_USER: User = {
  uid: "anon",
  displayName: "Anonymous",
};

const initialState: AuthContextState = {
  user: DEFAULT_USER,
  isAnonymous: true,
};

export interface AuthContextState {
  user: User;
  isAnonymous?: boolean;
}

export const AuthContext = createContext<AuthContextState>(initialState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  //
  const [state, setState] = useState<AuthContextState>(initialState);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  //
  return useContext(AuthContext);
}
