import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdminStaffRole } from "@/lib/is-admin-staff-client";
import { validateServerAuthSession } from "@/lib/admin-fetch";

type User = {
  id: string;
  email: string;
  role: string;
};

/**
 * Admin UI gate — authority is `/api/users/me` (cookies), not localStorage role.
 */
export function useAdminAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const session = await validateServerAuthSession();
        if (cancelled) return;

        if (!session.ok || !session.user) {
          setIsAuthorized(false);
          setIsLoading(false);
          const redirect =
            typeof window !== "undefined" ? window.location.pathname : "/admin";
          router.push(
            "/auth/login?redirect=" + encodeURIComponent(redirect)
          );
          return;
        }

        if (!isAdminStaffRole(session.user.role)) {
          setIsAuthorized(false);
          setIsLoading(false);
          router.push("/");
          return;
        }

        setUser({
          id: session.user.id || "",
          email: session.user.email || "",
          role: String(session.user.role || ""),
        });
        setIsAuthorized(true);
        setIsLoading(false);
      } catch {
        if (cancelled) return;
        setIsAuthorized(false);
        setIsLoading(false);
        router.push("/auth/login");
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, isAuthorized, isLoading };
}
