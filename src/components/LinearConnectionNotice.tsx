import { Alert, AlertTitle, Box, Button } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import { useNavigate } from 'react-router-dom'
import { NAV_ROUTES } from '../constants'

interface LinearConnectionNoticeProps {
  hasApiKey: boolean
  hasUploadedData: boolean
  isError: boolean
  error?: unknown
  isEmpty: boolean
}

/**
 * Explains WHY there is no Linear data instead of silently showing "0 tickets".
 * Returns null when data is present and healthy, so callers can render normally.
 */
export const LinearConnectionNotice = ({
  hasApiKey,
  hasUploadedData,
  isError,
  error,
  isEmpty
}: LinearConnectionNoticeProps) => {
  const navigate = useNavigate()

  // Data is flowing fine — nothing to say.
  if (!isEmpty && !isError) return null

  const goToSettings = (
    <Button color="inherit" size="small" startIcon={<SettingsIcon />} onClick={() => navigate(NAV_ROUTES.SETTINGS)}>
      Open Settings
    </Button>
  )

  // A key (or upload) exists but the request failed — show the real reason.
  if (isError) {
    const message = error instanceof Error ? error.message : 'Unknown error contacting Linear.'
    return (
      <Box mb={3}>
        <Alert severity="error" action={goToSettings}>
          <AlertTitle>Couldn&apos;t load data from Linear</AlertTitle>
          {message}
          {/401|authenticat/i.test(message) && ' — your API key looks invalid or expired. Regenerate it and paste it again in Settings.'}
        </Alert>
      </Box>
    )
  }

  // No credentials at all.
  if (!hasApiKey && !hasUploadedData) {
    return (
      <Box mb={3}>
        <Alert severity="info" action={goToSettings}>
          <AlertTitle>Not connected to Linear</AlertTitle>
          Paste a Linear personal API key in Settings (or upload a CSV/JSON export) to start pulling issues.
        </Alert>
      </Box>
    )
  }

  // Connected successfully, but Linear returned nothing.
  return (
    <Box mb={3}>
      <Alert severity="warning">
        <AlertTitle>Connected, but no issues found</AlertTitle>
        The Linear workspace returned zero issues for this key. Check that the key belongs to the right
        workspace and has access to the teams you expect.
      </Alert>
    </Box>
  )
}
