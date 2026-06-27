import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
import { setCatalogIdentity } from '../lib/catalog-http';
import { setOrdersIdentity } from '../lib/orders-api';

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
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
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

/**
 * Rol único a enviar en `x-user-role` a products-service. Usa `effectiveRole` si viene;
 * si no, escoge el de mayor privilegio (ADMIN > VENDOR > ANALYST > BUYER) para que la
 * autorización por rol de products no quede corta.
 */
const ROLE_PRIORITY = ['ADMIN', 'VENDOR', 'ANALYST', 'BUYER'];
function pickPrimaryRole(roles: string[], effectiveRole?: string): string | undefined {
  if (effectiveRole) return effectiveRole;
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks whether this tab is a duplicate — must show login, not inherit parent session
  const isSecondaryTab = useRef(false);
  const respondsAsPrimaryTab = useRef(false);
  // True once the 150 ms BroadcastChannel handshake has finished
  const tabRoleResolved = useRef(false);
  // onAuthStateChanged fires immediately; if tab role isn't resolved yet we store it here
  // undefined = not yet received, null = signed out, FirebaseUser = signed in
  const pendingAuthUser = useRef<FirebaseUser | null | undefined>(undefined);

  const getToken = async (): Promise<string> => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    return auth.currentUser.getIdToken();
  };

  const syncAndLoadProfile = async (user: FirebaseUser, fullName?: string, phone?: string) => {
    try {
      const token = await user.getIdToken();

      const body: Record<string, string> = {
        fullName: fullName || user.displayName || user.email?.split('@')[0] || 'Usuario',
      };
      if (phone) body.phone = phone;

      // sync-profile crea el perfil local si no existe y retorna un sessionId
      const syncResponse = await apiFetch<{ sessionId: string }>('/auth/sync-profile', token, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      sessionStorage.setItem('sessionId', syncResponse.sessionId);

      // Cargar perfil completo con roles y permisos
      const profile = await apiFetch<Record<string, unknown>>('/users/me', token);

      const rawRoles = (profile.userRoles || profile.roles) as unknown;
      const roleNames = extractRoleNames(rawRoles);

      // permisos: pueden venir del perfil o derivarlos de los roles
      const rawPerms = profile.permissions as string[] | undefined;

      const effectiveRole = profile.effectiveRole as string | undefined;

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
        effectiveRole,
      });

      // products y orders confían en x-user-id / x-user-role (patrón gateway): publicamos
      // la identidad para que sus clientes la envíen en cada request.
      const gatewayIdentity = {
        userId: profile.id as string,
        role: pickPrimaryRole(roleNames, effectiveRole),
      };
      setCatalogIdentity(gatewayIdentity);
      setOrdersIdentity(gatewayIdentity);
    } catch (err) {
      console.error('Failed to sync/load profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser) await syncAndLoadProfile(firebaseUser);
  };

  const activateAuthenticatedTab = async (user: FirebaseUser, fullName?: string, phone?: string) => {
    isSecondaryTab.current = false;
    tabRoleResolved.current = true;
    respondsAsPrimaryTab.current = true;
    pendingAuthUser.current = user;
    setLoading(true);
    setFirebaseUser(user);
    await syncAndLoadProfile(user, fullName, phone);
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    // El usuario elige iniciar sesión explícitamente, incluso en tab duplicado
    isSecondaryTab.current = false;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await activateAuthenticatedTab(cred.user);
  };

  const signInWithGoogle = async () => {
    isSecondaryTab.current = false;
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await activateAuthenticatedTab(cred.user);
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    isSecondaryTab.current = false;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await activateAuthenticatedTab(cred.user, fullName, phone);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    sessionStorage.removeItem('sessionId');
    respondsAsPrimaryTab.current = false;
    await firebaseSignOut(auth);
    setUserProfile(null);
    setCatalogIdentity(null);
    setOrdersIdentity(null);
  };

  const isAdmin = () => userProfile?.roles.includes('ADMIN') ?? false;
  const isVendor = () =>
    (userProfile?.roles.includes('VENDOR') || userProfile?.roles.includes('ADMIN')) ?? false;

  useEffect(() => {
    const TAB_ID = crypto.randomUUID();
    const channel = new BroadcastChannel('auth_session');
    let isPrimary = false;

    channel.postMessage({ type: 'CLAIM_PRIMARY', tabId: TAB_ID });

    const claimTimeout = setTimeout(async () => {
      // Nadie respondió en 150 ms → somos el tab primario
      isPrimary = true;
      respondsAsPrimaryTab.current = true;
      tabRoleResolved.current = true;

      // onAuthStateChanged ya puede haber disparado y guardado el usuario
      if (pendingAuthUser.current !== undefined) {
        const user = pendingAuthUser.current;
        setFirebaseUser(user);
        if (user) await syncAndLoadProfile(user).catch(console.error);
        setLoading(false);
      }
      // Si pendingAuthUser sigue undefined, Firebase no terminó de inicializar.
      // onAuthStateChanged disparará pronto y tabRoleResolved=true lo procesará.
    }, 150);

    const handleMessage = (e: MessageEvent<{ type: string; tabId?: string; forTabId?: string }>) => {
      if (e.data.type === 'CLAIM_PRIMARY' && (isPrimary || respondsAsPrimaryTab.current)) {
        channel.postMessage({ type: 'PRIMARY_EXISTS', forTabId: e.data.tabId });
      }
      if (e.data.type === 'PRIMARY_EXISTS' && e.data.forTabId === TAB_ID) {
        clearTimeout(claimTimeout);
        isSecondaryTab.current = true;
        respondsAsPrimaryTab.current = false;
        tabRoleResolved.current = true;
        sessionStorage.removeItem('sessionId');
        pendingAuthUser.current = null;
        setFirebaseUser(null);
        setUserProfile(null);
        setCatalogIdentity(null);
        setOrdersIdentity(null);
        setLoading(false);
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
      if (!tabRoleResolved.current) {
        // Tab role aún no resuelto — guardar para procesarlo cuando lo sea
        pendingAuthUser.current = user;
        return;
      }
      if (isSecondaryTab.current) { setLoading(false); return; }
      setFirebaseUser(user);
      if (user) {
        await syncAndLoadProfile(user);
      } else {
        setUserProfile(null);
        setCatalogIdentity(null);
        setOrdersIdentity(null);
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
