import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import type { StoryGenerationRequest } from '@story-generator/shared';
import { Control, Controller } from 'react-hook-form';

type Props = { control: Control<StoryGenerationRequest> };

const marks = [
  { value: 500, label: '500' },
  { value: 2000, label: '2000' },
  { value: 5000, label: '5000' },
  { value: 10000, label: '10К' },
];

export function LengthSlider({ control }: Props) {
  return (
    <Controller
      name="targetLength"
      control={control}
      render={({ field }) => (
        <Box>
          <Typography gutterBottom>Длина: {field.value.toLocaleString('ru')} слов</Typography>
          <Slider
            {...field}
            min={500}
            max={10000}
            step={100}
            marks={marks}
            valueLabelDisplay="auto"
          />
        </Box>
      )}
    />
  );
}
