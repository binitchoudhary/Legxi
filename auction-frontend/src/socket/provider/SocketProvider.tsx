'use client';

import * as React from 'react';

export const SocketContext = React.createContext<any>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Socket Connection Manager stub
  return <SocketContext.Provider value={{}}>{children}</SocketContext.Provider>;
}
