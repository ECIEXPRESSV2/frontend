import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiFetch } from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  emailVerified?: boolean;
  createdAt: string;
  roles: string[];
  permissions: string[];
  effectiveRole?: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  getToken: () => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: () => boolean;
  isVendor: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function extractRoleNames(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  if (roles.length === 0) return [];
  if (typeof roles[0] === 'string') return roles as string[];
  return (roles as Array<{ name?: string; role?: { name: string } }>).map(
    r => r.name || r.role?.name || ''
  ).filter(Boolean);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = async (): Promise<string> => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    return auth.currentUser.getIdToken();
  };

  const syncAndLoadProfile = async (user: FirebaseUser, fullName?: string) => {
    try {
      const token = await user.getIdToken();

      // sync-profile crea el perfil local si no existe y retorna un sessionId
      const syncResponse = await apiFetch<{ sessionId: string }>('/auth/sync-profile', token, {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName || user.displayName || user.email?.split('@')[0] || 'Usuario',
        }),
      });
      sessionStorage.setItem('sessionId', syncResponse.sessionId);

      // Cargar perfil completo con roles y permisos
      const profile = await apiFetch<Record<string, unknown>>('/users/me', token);

      const rawRoles = (profile.userRoles || profile.roles) as unknown;
      const roleNames = extractRoleNames(rawRoles);

      // permisos: pueden venir del perfil o derivarlos de los roles
      const rawPerms = profile.permissions as string[] | undefined;

      setUserProfile({
        id: profile.id as string,
        email: profile.email as string,
        fullName: (profile.fullName || profile.displayName) as string,
        phone: profile.phone as string | undefined,
        avatarUrl: (profile.avatarUrl || profile.photoURL) as string | undefined,
        status: (profile.status || 'ACTIVE') as UserProfile['status'],
        emailVerified: profile.emailVerified as boolean | undefined,
        createdAt: profile.createdAt as string,
        roles: roleNames,
        permissions: rawPerms || [],
        effectiveRole: profile.effectiveRole as string | undefined,
      });
    } catch (err) {
      console.error('Failed to sync/load profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser) await syncAndLoadProfile(firebaseUser);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encarga del sync
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await syncAndLoadProfile(cred.user, fullName);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    sessionStorage.removeItem('sessionId');
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const isAdmin = () => userProfile?.roles.includes('ADMIN') ?? false;
  const isVendor = () =>
    (userProfile?.roles.includes('VENDOR') || userProfile?.roles.includes('ADMIN')) ?? false;

  useEffect(() => {
    const TAB_ID = crypto.randomUUID();
    const channel = new BroadcastChannel('auth_session');
    let isPrimary = false;

    channel.postMessage({ type: 'CLAIM_PRIMARY', tabId: TAB_ID });
    const claimTimeout = setTimeout(() => { isPrimary = true; }, 150);

    const handleMessage = (e: MessageEvent<{ type: string; tabId?: string; forTabId?: string }>) => {
      if (e.data.type === 'CLAIM_PRIMARY' && isPrimary) {
        channel.postMessage({ type: 'PRIMARY_EXISTS', forTabId: e.data.tabId });
      }
      if (e.data.type === 'PRIMARY_EXISTS' && e.data.forTabId === TAB_ID) {
        clearTimeout(claimTimeout);
        sessionStorage.removeItem('sessionId');
        window.location.href = '/';
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(claimTimeout);
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncAndLoadProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        getToken,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        resetPassword,
        isAdmin,
        isVendor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
