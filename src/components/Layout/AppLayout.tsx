import { useState } from 'react'
import { Box, AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material'
import { styled } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { AIChatDrawer } from '../AIChat/AIChatDrawer'
import { useAppStore } from '../../stores/useAppStore'

const DRAWER_WIDTH = 240

const LayoutRoot = styled(Box)({
  display: 'flex',
  height: '100vh',
  overflow: 'hidden'
})

const ContentArea = styled(Box)({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  marginLeft: DRAWER_WIDTH,
  '@media (max-width: 600px)': { marginLeft: 0 }
})

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  overflow: 'auto',
  backgroundColor: theme.palette.background.default
}))

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['linear-issues'] });
  };

  return (
    <LayoutRoot>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <ContentArea>
        <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #e2e8f0' }}>
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.secondary', fontSize: '0.9rem' }}>
              Linear Dashboard
            </Typography>
            <Tooltip title="Refresh tickets">
              <IconButton onClick={handleRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ask AI about tickets">
              <IconButton onClick={() => setAiOpen(true)} color="primary">
                <SmartToyIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <MainContent>{children}</MainContent>
      </ContentArea>
      <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </LayoutRoot>
  );
}
