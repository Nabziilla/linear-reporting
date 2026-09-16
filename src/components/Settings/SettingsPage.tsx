import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, TextField, Button, Alert, CircularProgress, Divider, Link, Stack, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAppStore } from '../../stores/useAppStore'
import { useLinearViewer } from '../../hooks/useLinearData'
import { LinearDataUpload } from '../LinearDataUpload'
import { ThemeMode } from '../../types'

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
  backgroundColor: theme.palette.action.hover,
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
  const { settings, updateSettings } = useAppStore()
  const queryClient = useQueryClient()

  const linearForm = useForm<LinearForm>({
    resolver: zodResolver(linearSchema),
    defaultValues: { linearApiKey: settings.linearApiKey }
  })

  const anthropicForm = useForm<AnthropicForm>({
    resolver: zodResolver(anthropicSchema),
    defaultValues: { anthropicApiKey: settings.anthropicApiKey }
  })

  const refreshLinearData = () => {
    queryClient.invalidateQueries({ queryKey: ['linear-viewer'] })
    queryClient.invalidateQueries({ queryKey: ['linear-issues'] })
    queryClient.invalidateQueries({ queryKey: ['linear-teams'] })
    queryClient.invalidateQueries({ queryKey: ['linear-members'] })
  }

  const saveLinearKey = (values: LinearForm) => {
    updateSettings({ linearApiKey: values.linearApiKey.trim() })
    refreshLinearData()
  }

  const saveAnthropicKey = (values: AnthropicForm) => {
    updateSettings({ anthropicApiKey: values.anthropicApiKey.trim() })
  }

  const setThemeMode = (mode: ThemeMode | null) => {
    if (mode) updateSettings({ themeMode: mode })
  }

  const [uploadCount, setUploadCount] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem('linear-upload-data')
      if (!raw) return 0
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.length : 0
    } catch {
      return 0
    }
  })

  useEffect(() => {
    linearForm.reset({ linearApiKey: settings.linearApiKey })
  }, [settings.linearApiKey, linearForm])

  return (
    <PageRoot>
      <Typography variant="h5">Settings</Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Appearance</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Choose how the dashboard looks on this device.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <ToggleButtonGroup
            value={settings.themeMode}
            exclusive
            onChange={(_e, mode) => setThemeMode(mode)}
          >
            <ToggleButton value="light">
              <LightModeIcon fontSize="small" sx={{ mr: 1 }} />
              Light
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkModeIcon fontSize="small" sx={{ mr: 1 }} />
              Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Linear API Key</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Paste a Linear personal API key to pull issues directly. Create one at{' '}
            <Link href="https://linear.app/settings/account/security" target="_blank" rel="noreferrer">
              linear.app → Settings → API
            </Link>
            .
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box component="form" onSubmit={linearForm.handleSubmit(saveLinearKey)}>
            <Stack spacing={2}>
              <Controller
                name="linearApiKey"
                control={linearForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Linear API Key"
                    type="password"
                    fullWidth
                    error={!!linearForm.formState.errors.linearApiKey}
                    helperText={linearForm.formState.errors.linearApiKey?.message ?? 'lin_api_xxxxxxxx'}
                    autoComplete="off"
                  />
                )}
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">Save Linear Key</Button>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={refreshLinearData}
                  disabled={!settings.linearApiKey}
                >
                  Refresh data
                </Button>
              </Stack>
              {settings.linearApiKey && <ConnectionStatus />}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Import from CSV / JSON</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Optional. Uploaded data overrides API-fetched data while present in this browser session.
            Use this for offline analysis or one-off exports from Linear.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <LinearDataUpload onData={(rows) => setUploadCount(rows.length)} />
          {uploadCount > 0 && (
            <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
              {uploadCount} uploaded record{uploadCount === 1 ? '' : 's'} currently active. Clear to fall back to the API key.
            </Alert>
          )}
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
              <Box>
                <Button type="submit" variant="outlined">Save Anthropic Key</Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Alert severity="info" variant="outlined">
        Keys are stored in your browser&apos;s local storage only — never sent to any third party.
      </Alert>
    </PageRoot>
  )
}
