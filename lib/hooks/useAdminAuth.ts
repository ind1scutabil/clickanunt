import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  role: string;
};

export function useAdminAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Get user from localStorage
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        
        if (!userStr) {
          // No user logged in
          setIsAuthorized(false);
          setIsLoading(false);
          router.push('/auth/login?redirect=' + (typeof window !== 'undefined' ? window.location.pathname : ''));
          return;
        }

        const parsedUser = JSON.parse(userStr) as User;
        const roleNorm = String(parsedUser.role || '')
          .trim()
          .toLowerCase();

        // CRITICAL: Only admin/owner roles allowed (aliniat cu RBAC din backend)
        if (roleNorm !== 'admin' && roleNorm !== 'owner') {
          console.error('❌ SECURITY: Unauthorized admin access attempt!', {
            email: parsedUser.email,
            role: parsedUser.role,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
          });
          
          // Log security incident
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('lastSecurityIncident', JSON.stringify({
              type: 'unauthorized_admin_access',
              email: parsedUser.email,
              role: parsedUser.role,
              timestamp: new Date().toISOString()
            }));
          }

          setIsAuthorized(false);
          setIsLoading(false);
          router.push('/');
          return;
        }

        setUser(parsedUser);
        setIsAuthorized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
        setIsLoading(false);
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  return { user, isAuthorized, isLoading };
}
