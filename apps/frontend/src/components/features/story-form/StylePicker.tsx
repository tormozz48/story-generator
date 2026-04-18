import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { StoryStyleSchema } from '@story-generator/shared';
import type { StoryGenerationRequest } from '@story-generator/shared';
import { Control, Controller } from 'react-hook-form';

type Props = { control: Control<StoryGenerationRequest> };

const STYLE_LABELS: Record<string, string> = {
  photorealistic: 'Фотореализм',
  anime: 'Аниме',
  painterly: 'Живопись',
  illustration: 'Иллюстрация',
  comic: 'Комикс',
};

export function StylePicker({ control }: Props) {
  return (
    <Controller
      name="style"
      control={control}
      render={({ field }) => (
        <FormControl fullWidth>
          <InputLabel>Стиль иллюстраций</InputLabel>
          <Select {...field} label="Стиль иллюстраций">
            {StoryStyleSchema.options.map((style) => (
              <MenuItem key={style} value={style}>
                {STYLE_LABELS[style] ?? style}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
}
