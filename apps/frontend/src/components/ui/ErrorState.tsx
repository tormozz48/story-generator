import Alert from '@mui/material/Alert';

type Props = { message?: string };

export function ErrorState({ message = 'Что-то пошло не так' }: Props) {
  return <Alert severity="error">{message}</Alert>;
}
