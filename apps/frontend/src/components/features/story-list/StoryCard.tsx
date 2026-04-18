import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { Story } from '@story-generator/shared';
import Link from 'next/link';

type Props = { story: Story };

// TODO: Week 2 — flesh out card with title, status badge, created date
export function StoryCard({ story }: Props) {
  return (
    <Card component={Link} href={`/stories/${story.id}`} sx={{ textDecoration: 'none', mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{story.title ?? 'Без названия'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {story.status}
        </Typography>
      </CardContent>
    </Card>
  );
}
