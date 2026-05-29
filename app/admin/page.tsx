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
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1f3d'}}>
      <div style={{background:'#fff',borderRadius:'16px',padding:'2.5rem',width:'100%',maxWidth:'400px',display:'flex',flexDirection:'column',gap:'1rem',boxShadow:'0 4px 24px rgba(0,0,0,0.2)'}}>
        <div style={{textAlign:'center',marginBottom:'0.5rem'}}>
          <div style={{color:'#c9a84c',fontSize:'24px',fontWeight:'700',marginBottom:'4px'}}>My Journey to America</div>
          <div style={{color:'#666',fontSize:'14px'}}>Admin Panel</div>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'15px',outline:'none'}}
        />
        <button
          onClick={handleLogin}
          style={{padding:'12px',borderRadius:'8px',background:'#c9a84c',color:'#fff',border:'none',fontSize:'15px',fontWeight:'600',cursor:'pointer'}}
        >
          Sign In
        </button>
        {error && <p style={{color:'red'}}>{error}</p>}
      </div>
    </div>
  )

  return <AdminPanel onLogout={handleLogout} />
}
