import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6875F5', light: '#8B95F8', dark: '#4F5BD5' },
    secondary: { main: '#26B5CE' },
    background: { default: '#0F1117', paper: '#1A1D27' },
    error: { main: '#f43f5e' },
    warning: { main: '#f97316' },
    success: { main: '#22c55e' },
    divider: 'rgba(255,255,255,0.07)',
    text: { primary: '#F1F5F9', secondary: '#94A3B8' }
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    overline: { letterSpacing: '0.08em', fontWeight: 600, fontSize: '0.7rem' }
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.07)',
          background: '#1A1D27',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
          '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.05)' }
        }
      }
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8rem',
          border: '1px solid rgba(255,255,255,0.1)',
          '&.Mui-selected': {
            backgroundColor: '#6875F5',
            color: '#fff',
            '&:hover': { backgroundColor: '#4F5BD5' }
          }
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: '#13151F',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#13151F',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(255,255,255,0.07)' }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          width: 'calc(100% - 16px)',
          '&.Mui-selected': {
            backgroundColor: 'rgba(104, 117, 245, 0.15)',
            color: '#8B95F8',
            '& .MuiListItemIcon-root': { color: '#8B95F8' },
            '&:hover': { backgroundColor: 'rgba(104, 117, 245, 0.22)' }
          },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  }
})
