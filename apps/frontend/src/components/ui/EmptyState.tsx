import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type Props = { message?: string };

export function EmptyState({ message = 'Ничего не найдено' }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}
