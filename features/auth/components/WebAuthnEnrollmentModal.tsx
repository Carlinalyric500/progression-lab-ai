'use client';

import { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { useTranslation } from 'react-i18next';

import { createCsrfHeaders, ensureCsrfCookie } from '../../../lib/csrfClient';

type WebAuthnEnrollmentModalProps = {
  open: boolean;
  onClose: () => void;
};

async function getResponseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    if (data.message) {
      return data.message;
    }
  } catch {
    // Ignore parse errors and return fallback.
  }

  return fallback;
}

async function getRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  await ensureCsrfCookie();

  const response = await fetch('/api/auth/webauthn/register/options', {
    method: 'POST',
    credentials: 'include',
    headers: createCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response, 'auth.webauthn.errors.startFailed'));
  }

  const data = (await response.json()) as { options: PublicKeyCredentialCreationOptionsJSON };
  return data.options;
}

async function saveRegistration(regResponse: RegistrationResponseJSON): Promise<void> {
  await ensureCsrfCookie();

  const response = await fetch('/api/auth/webauthn/register/verify', {
    method: 'POST',
    credentials: 'include',
    headers: createCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      response: regResponse,
      label: 'My first security key',
    }),
  });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response, 'auth.webauthn.errors.enrollmentFailed'));
  }
}

export default function WebAuthnEnrollmentModal({ open, onClose }: WebAuthnEnrollmentModalProps) {
  const { t } = useTranslation('common');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEnroll = useCallback(async () => {
    setError(null);
    setIsEnrolling(true);

    try {
      const options = await getRegistrationOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      await saveRegistration(regResponse);
      setSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const message = (err as Error).message ?? 'auth.webauthn.errors.enrollmentFailed';
      setError(
        message.includes('NotAllowedError') || message.includes('The operation')
          ? t('auth.webauthn.errors.cancelledOrTimedOut')
          : message.startsWith('auth.')
            ? t(message)
            : message,
      );
    } finally {
      setIsEnrolling(false);
    }
  }, [onClose, t]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon />
          <span>{t('auth.webauthn.title')}</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {success ? (
            <Alert severity="success">{t('auth.webauthn.successMessage')}</Alert>
          ) : (
            <>
              <Typography>{t('auth.webauthn.description')}</Typography>

              {error && <Alert severity="error">{error}</Alert>}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<SecurityIcon />}
                  onClick={() => void handleEnroll()}
                  disabled={isEnrolling}
                  fullWidth
                >
                  {isEnrolling
                    ? t('auth.webauthn.actions.followBrowserPrompt')
                    : t('auth.webauthn.actions.addSecurityKey')}
                </Button>
                <Button onClick={onClose} disabled={isEnrolling} variant="outlined">
                  {t('auth.webauthn.actions.skip')}
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
