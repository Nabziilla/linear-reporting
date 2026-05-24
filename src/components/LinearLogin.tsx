import { useEffect } from 'react'

const CLIENT_ID = 'YOUR_LINEAR_CLIENT_ID'
const REDIRECT_URI = 'http://localhost:5173/oauth-callback'
const AUTH_URL = `https://linear.app/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read&state=linear_oauth`

export const LinearLoginButton = () => {
  const handleLogin = () => {
    window.location.href = AUTH_URL
  }

  return (
    <button onClick={handleLogin} style={{ padding: '8px 16px', fontSize: 16, borderRadius: 4, background: '#5E6AD2', color: '#fff', border: 'none', cursor: 'pointer' }}>
      Login with Linear
    </button>
  )
}

// OAuth callback handler (to be used in a new page/component)
export const LinearOAuthCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      // Exchange code for access token (requires backend endpoint)
      // fetch('/api/oauth/linear', { method: 'POST', body: JSON.stringify({ code }) })
      //   .then(...)
    }
  }, [])
  return <div>Logging in...</div>
}
