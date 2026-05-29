'use client'
import { useState, useEffect } from 'react'
import AdminPanel from './AdminPanel'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setAuthed(true)
    }
  }, [])

  function handleLogin() {
    if (password === 'admin123') {
      sessionStorage.setItem('adminAuth', 'true')
      setAuthed(true)
    } else {
      setError('Incorrect password')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    setAuthed(false)
  }

  if (!authed) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:'1rem'}}>
      <h1>Admin Login</h1>
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
      <button onClick={handleLogin}>Sign In</button>
      {error && <p style={{color:'red'}}>{error}</p>}
    </div>
  )

  return <AdminPanel onLogout={handleLogout} />
}
