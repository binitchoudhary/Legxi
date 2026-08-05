'use client';

import * as React from 'react';

export const AuthContext = React.createContext<unknown>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState(null);
  
  // BFF Authentication initialization stub
  React.useEffect(() => {
    // Check HttpOnly session status via Next.js API route
    // GET /api/auth/session
  }, []);

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
