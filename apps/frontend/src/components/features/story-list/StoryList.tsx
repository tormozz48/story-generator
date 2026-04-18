'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// TODO: Week 2 — fetch stories from backend and render StoryCard list
export function StoryList() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Мои истории
      </Typography>
      <Typography color="text.secondary">Ваши истории появятся здесь после создания.</Typography>
    </Box>
  );
}
