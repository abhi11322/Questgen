// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'firebase/auth'

import { auth } from '../firebase'
import { UsersAPI } from '../services/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [user, setUser] = useState(null) // backend user
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u)

      if (u) {
        try {
          const backendUser = await UsersAPI.byFirebaseUid(u.uid)
          setUser(backendUser)
        } catch (err) {
          console.error('Backend user fetch failed:', err)
          setUser(null)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    return result.user
  }

  const logout = async () => {
    await signOut(auth)
  }

  const value = {
    firebaseUser,
    user,
    setUser,
    loginWithGoogle,
    logout,
    loading
  }

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
