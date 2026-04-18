import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

import { Header } from './Header';

type Props = { children: React.ReactNode };

export function AppShell({ children }: Props) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
