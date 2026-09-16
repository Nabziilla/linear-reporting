import { useState } from 'react'
import { Box, AppBar, Toolbar, IconButton, Tooltip, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import RefreshIcon from '@mui/icons-material/Refresh'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { AIChatDrawer } from '../AIChat/AIChatDrawer'

const DRAWER_WIDTH = 240

const LayoutRoot = styled(Box)({
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
})

const ContentArea = styled(Box)({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  marginLeft: DRAWER_WIDTH,
  '@media (max-width: 600px)': { marginLeft: 0 },
})

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  overflow: 'auto',
  backgroundColor: theme.palette.background.default,
}))

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['linear-issues'] })
  }

  return (
    <LayoutRoot>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <ContentArea>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ minHeight: '52px !important', px: 2.5 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Chip
              icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: '#22c55e !important' }} />}
              label="Live"
              size="small"
              sx={{
                bgcolor: 'rgba(34,197,94,0.12)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.25)',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Refresh tickets">
              <IconButton onClick={handleRefresh} size="small" sx={{ color: 'text.secondary', mr: 0.5 }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ask AI about tickets">
              <IconButton
                onClick={() => setAiOpen(true)}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #6875F5, #26B5CE)',
                  color: '#fff',
                  width: 30,
                  height: 30,
                  '&:hover': { opacity: 0.85 },
                }}
              >
                <SmartToyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <MainContent>{children}</MainContent>
      </ContentArea>
      <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </LayoutRoot>
  )
}
