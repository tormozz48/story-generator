import Box from '@mui/material/Box';
import Image from 'next/image';

type Props = { src: string; alt: string };

export function SceneImage({ src, alt }: Props) {
  return (
    <Box sx={{ my: 3, borderRadius: 2, overflow: 'hidden', boxShadow: 2 }}>
      <Image
        src={src}
        alt={alt}
        width={720}
        height={480}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </Box>
  );
}
