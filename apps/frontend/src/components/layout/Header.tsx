import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export function Header() {
  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
        >
          StoryGen
        </Typography>
        <Typography
          component={Link}
          href="/stories"
          variant="body2"
          sx={{ ml: 4, textDecoration: 'none', color: 'text.secondary' }}
        >
          Мои истории
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
