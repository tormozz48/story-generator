import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Image from 'next/image';

type Props = { src: string; title: string };

export function ReferencePortrait({ src, title }: Props) {
  return (
    <Tooltip title="Главный персонаж" placement="left">
      <Box
        sx={{
          float: 'right',
          ml: 3,
          mb: 2,
          width: 160,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
          flexShrink: 0,
        }}
      >
        <Image
          src={src}
          alt={`Портрет персонажа — ${title}`}
          width={160}
          height={213}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', p: 0.5, bgcolor: 'background.paper' }}
        >
          Персонаж
        </Typography>
      </Box>
    </Tooltip>
  );
}
