import { Alert, Snackbar } from '@mui/material';

type SuccessSnackbarProps = {
  open: boolean;
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
};

export default function SuccessSnackbar({
  open,
  message,
  onClose,
  autoHideDuration = 6000,
}: SuccessSnackbarProps) {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
    >
      <Alert severity="success" variant="filled" onClose={onClose} sx={{ color: '#fff' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
