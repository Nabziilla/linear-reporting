import { Box, Card, CardContent, Typography, TextField, Button, Alert, CircularProgress, Divider, Link, Stack } from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppStore } from '../../stores/useAppStore'
import { LinearLoginButton } from '../LinearLogin'

const PageRoot = styled(Box)(({ theme }) => ({
  maxWidth: 600,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3)
}))

const StatusRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#f8fafc',
  marginTop: theme.spacing(1.5)
}))

const linearSchema = z.object({
  linearApiKey: z.string().min(1, 'Linear API key is required')
})

const anthropicSchema = z.object({
  anthropicApiKey: z.string().min(1, 'Anthropic API key is required')
})

type LinearForm = z.infer<typeof linearSchema>
type AnthropicForm = z.infer<typeof anthropicSchema>

const ConnectionStatus = () => {
  const { data: viewer, isLoading, isError, isSuccess, error } = useLinearViewer()

  if (isLoading) {
    return (
      <StatusRow>
        <CircularProgress size={16} />
        <Typography variant="body2">Verifying connection…</Typography>
      </StatusRow>
    )
  }
  if (isSuccess && viewer) {
    return (
      <StatusRow>
        <CheckCircleIcon color="success" fontSize="small" />
        <Typography variant="body2">
          Connected as <strong>{viewer.name}</strong> ({viewer.email})
        </Typography>
      </StatusRow>
    )
  }
  if (isError) {
    const msg = error instanceof Error ? error.message : 'Connection failed'
    return (
      <StatusRow>
        <ErrorIcon color="error" fontSize="small" />
        <Typography variant="body2" color="error">{msg}</Typography>
      </StatusRow>
    )
  }
  return null
}

export const SettingsPage = () => {
  const { settings, updateSettings } = useAppStore();
  const anthropicForm = useForm<AnthropicForm>({
    resolver: zodResolver(anthropicSchema),
    defaultValues: { anthropicApiKey: settings.anthropicApiKey }
  });

  const saveAnthropicKey = (values: AnthropicForm) => {
    updateSettings({ anthropicApiKey: values.anthropicApiKey });
  };

  return (
    <PageRoot>
      <Typography variant="h5">Settings</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Linear Login</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Login with your Linear account to connect and fetch your workspace data.
          </Typography>
          <LinearLoginButton />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>AI Chat (Anthropic)</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Required only if you want to use the AI chat feature. Get a key from{' '}
            <Link href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              console.anthropic.com
            </Link>
            .
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box component="form" onSubmit={anthropicForm.handleSubmit(saveAnthropicKey)}>
            <Stack spacing={2}>
              <Controller
                name="anthropicApiKey"
                control={anthropicForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Anthropic API Key"
                    type="password"
                    fullWidth
                    error={!!anthropicForm.formState.errors.anthropicApiKey}
                    helperText={anthropicForm.formState.errors.anthropicApiKey?.message ?? 'sk-ant-xxxxxxxx'}
                    autoComplete="off"
                  />
                )}
              />
              {settings.anthropicApiKey && (
                <Alert severity="success" variant="outlined">Anthropic key saved.</Alert>
              )}
              <Button type="submit" variant="outlined">
                Save Anthropic Key
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
      <Alert severity="info" variant="outlined">
        Keys are stored in your browser&apos;s local storage only — never sent to any third party.
      </Alert>
    </PageRoot>
  );
};
