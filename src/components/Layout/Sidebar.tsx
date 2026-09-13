import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import AssessmentIcon from '@mui/icons-material/Assessment'
import ScienceIcon from '@mui/icons-material/Science'
import SettingsIcon from '@mui/icons-material/Settings'
import { useNavigate, useLocation } from 'react-router-dom'
import { NAV_ROUTES } from '../../constants'

const DRAWER_WIDTH = 240

const DrawerHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2, 1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5)
}))

const Logo = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1.1rem',
  color: theme.palette.primary.main
}))

const NAV_ITEMS = [
  { label: 'Dashboard', path: NAV_ROUTES.DASHBOARD, icon: <DashboardIcon /> },
  { label: 'Tickets', path: NAV_ROUTES.TICKETS, icon: <ConfirmationNumberIcon /> },
  { label: 'Reports', path: NAV_ROUTES.REPORTS, icon: <AssessmentIcon /> },
  { label: 'QA Report', path: NAV_ROUTES.QA_REPORT, icon: <ScienceIcon /> },
  { label: 'Settings', path: NAV_ROUTES.SETTINGS, icon: <SettingsIcon /> },
  { label: 'Logs', path: '/logs', icon: <AssessmentIcon /> }
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

const DrawerContent = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // No longer show Linear user chip
  return (
    <>
      <DrawerHeader>
        <Logo>Linear Dashboard</Logo>
      </DrawerHeader>
      <Divider />
      <List>
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <ListItemButton
            key={path}
            selected={pathname === path}
            onClick={() => navigate(path)}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
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
