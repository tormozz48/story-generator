'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { makeQueryClient } from '@/lib/query-client';
import { theme } from '@/lib/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  // Stable QueryClient per render tree (not re-created on every render)
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
