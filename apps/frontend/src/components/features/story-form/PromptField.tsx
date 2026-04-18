import TextField from '@mui/material/TextField';
import type { StoryGenerationRequest } from '@story-generator/shared';
import { Control, Controller, FieldError } from 'react-hook-form';

type Props = {
  control: Control<StoryGenerationRequest>;
  error?: FieldError;
};

export function PromptField({ control, error }: Props) {
  return (
    <Controller
      name="prompt"
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          label="Опишите историю"
          multiline
          rows={4}
          error={!!error}
          helperText={error?.message ?? 'Опишите персонажей, сеттинг, настроение…'}
          fullWidth
          inputProps={{ maxLength: 2000 }}
        />
      )}
    />
  );
}
