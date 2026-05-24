import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { AppLayout } from './components/Layout/AppLayout'
import { DashboardPage } from './components/Dashboard/DashboardPage'
import { TicketsPage } from './components/Tickets/TicketsPage'
import { ReportsPage } from './components/Reports/ReportsPage'
import { SettingsPage } from './components/Settings/SettingsPage'
import { LogsPage } from './components/LogsPage'

import { theme } from './theme'
import { NAV_ROUTES } from './constants'
import { LinearLoginButton, LinearOAuthCallback } from './components/LinearLogin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/oauth-callback" element={<LinearOAuthCallback />} />
          <Route
            path="*"
            element={
              <AppLayout>
                <Routes>
                  <Route path={NAV_ROUTES.DASHBOARD} element={<DashboardPage />} />
                  <Route path={NAV_ROUTES.TICKETS} element={<TicketsPage />} />
                  <Route path={NAV_ROUTES.REPORTS} element={<ReportsPage />} />
                  <Route path={NAV_ROUTES.SETTINGS} element={<SettingsPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                </Routes>
                {/* Example: Show login button somewhere, e.g. on dashboard if not logged in */}
                {/* <LinearLoginButton /> */}
              </AppLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
)

export default App
