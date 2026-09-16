import { createTheme, type PaletteMode } from '@mui/material/styles'

export const getTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: { main: '#6875F5', light: '#8B95F8', dark: '#4F5BD5' },
      secondary: { main: '#26B5CE' },
      background: isDark
        ? { default: '#0F1117', paper: '#1A1D27' }
        : { default: '#F5F6FA', paper: '#FFFFFF' },
      error: { main: '#f43f5e' },
      warning: { main: '#f97316' },
      success: { main: '#22c55e' },
      divider: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
      text: isDark
        ? { primary: '#F1F5F9', secondary: '#94A3B8' }
        : { primary: '#0F172A', secondary: '#64748B' }
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
            border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
            background: isDark ? '#1A1D27' : '#FFFFFF',
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
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
            }
          }
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)' },
            '& .MuiTableCell-root': { borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(15,23,42,0.05)' }
          }
        }
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8rem',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.12)',
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
            backgroundColor: isDark ? '#13151F' : '#FFFFFF',
            borderRight: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.08)',
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? '#13151F' : '#FFFFFF',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.08)',
          }
        }
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)' }
        }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            width: 'calc(100% - 16px)',
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(104, 117, 245, 0.15)' : 'rgba(104, 117, 245, 0.1)',
              color: isDark ? '#8B95F8' : '#4F5BD5',
              '& .MuiListItemIcon-root': { color: isDark ? '#8B95F8' : '#4F5BD5' },
              '&:hover': { backgroundColor: isDark ? 'rgba(104, 117, 245, 0.22)' : 'rgba(104, 117, 245, 0.16)' }
            },
            '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)' }
          }
        }
      }
    }
  })
}
