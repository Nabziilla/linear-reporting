import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SettingsIcon from '@mui/icons-material/Settings'
import BugReportIcon from '@mui/icons-material/BugReport'
import { useNavigate, useLocation } from 'react-router-dom'
import { NAV_ROUTES } from '../../constants'

const DRAWER_WIDTH = 240

const DrawerHeader = styled(Box)({
  padding: '20px 16px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
})

const LogoMark = styled(Box)({
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'linear-gradient(135deg, #6875F5 0%, #26B5CE 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 0 16px rgba(104,117,245,0.4)',
})

const NAV_ITEMS = [
  { label: 'Dashboard', path: NAV_ROUTES.DASHBOARD, icon: <DashboardIcon fontSize="small" /> },
  { label: 'Tickets', path: NAV_ROUTES.TICKETS, icon: <ConfirmationNumberIcon fontSize="small" /> },
  { label: 'QA Reports', path: NAV_ROUTES.REPORTS, icon: <AssessmentIcon fontSize="small" /> },
  { label: 'Settings', path: NAV_ROUTES.SETTINGS, icon: <SettingsIcon fontSize="small" /> },
  { label: 'Logs', path: '/logs', icon: <BugReportIcon fontSize="small" /> },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

const DrawerContent = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <>
      <DrawerHeader>
        <LogoMark>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>L</Typography>
        </LogoMark>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#F1F5F9', lineHeight: 1.2 }}>
            Linear Hub
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: '#64748B' }}>Reporting Dashboard</Typography>
        </Box>
      </DrawerHeader>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <Box px={1}>
        <Typography variant="overline" sx={{ px: 1, color: '#475569', fontSize: '0.65rem' }}>
          Navigation
        </Typography>
      </Box>

      <List dense sx={{ px: 0 }}>
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <ListItemButton
            key={path}
            selected={pathname === path}
            onClick={() => navigate(path)}
          >
            <ListItemIcon sx={{ minWidth: 36, color: pathname === path ? '#8B95F8' : '#64748B' }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={label}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: pathname === path ? 600 : 400 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Box sx={{
          borderRadius: 2,
          p: 1.5,
          background: 'linear-gradient(135deg, rgba(104,117,245,0.15) 0%, rgba(38,181,206,0.1) 100%)',
          border: '1px solid rgba(104,117,245,0.2)',
        }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#8B95F8', fontWeight: 600, mb: 0.5 }}>
            Linear Reporting
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: '#64748B', lineHeight: 1.4 }}>
            Real-time ticket insights powered by the Linear API
          </Typography>
        </Box>
      </Box>
    </>
  )
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => (
  <>
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
    >
      <DrawerContent />
    </Drawer>
    <Drawer
      variant="permanent"
      sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
      open
    >
      <DrawerContent />
    </Drawer>
  </>
)
