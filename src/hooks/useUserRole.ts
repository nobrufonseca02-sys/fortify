import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUserRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      try {
        const { data } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        setIsAdmin(!!data);
      } catch (error) {
        // Safe fallback: if has_role function doesn't exist, assume not admin
        console.warn('has_role RPC not available, defaulting to non-admin:', error);
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkRole();
  }, [user]);

  return { isAdmin, loading };
}
