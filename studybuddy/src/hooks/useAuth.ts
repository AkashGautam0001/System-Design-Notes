"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";

interface User {
  id: string;
  email: string;
  name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error || !data?.user) {
        setUser(null);
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.profile?.name || data.user.email.split("@")[0],
        });
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const verifyEmail = async (email: string, code: string) => {
    const { data, error } = await insforge.auth.verifyEmail({
      email,
      otp: code,
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const resendVerification = async (email: string) => {
    const { data, error } = await insforge.auth.resendVerificationEmail({
      email,
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    await checkSession();
    return data;
  };

  const signOut = async () => {
    const { error } = await insforge.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
  };

  return {
    user,
    loading,
    signUp,
    verifyEmail,
    resendVerification,
    signIn,
    signOut,
    checkSession,
  };
}
