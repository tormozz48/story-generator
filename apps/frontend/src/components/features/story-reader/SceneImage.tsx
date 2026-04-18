import Box from '@mui/material/Box';
import Image from 'next/image';

type Props = { src: string; alt: string };

// TODO: Week 4 — render scene images inline with the story text
export function SceneImage({ src, alt }: Props) {
  return (
    <Box sx={{ my: 3, borderRadius: 2, overflow: 'hidden' }}>
      <Image
        src={src}
        alt={alt}
        width={720}
        height={480}
        style={{ width: '100%', height: 'auto' }}
      />
    </Box>
  );
}
