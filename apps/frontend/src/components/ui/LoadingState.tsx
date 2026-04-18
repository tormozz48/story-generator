import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export function LoadingState() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <CircularProgress />
    </Box>
  );
}
