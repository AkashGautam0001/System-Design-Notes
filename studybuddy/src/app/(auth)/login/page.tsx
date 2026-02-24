"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Link as HeroLink } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-default-500 text-sm">Sign in to continue your learning journey</p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onValueChange={setEmail}
              isRequired
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onValueChange={setPassword}
              isRequired
            />
            {error && (
              <p className="text-danger text-sm">{error}</p>
            )}
            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
            <p className="text-center text-sm text-default-500">
              Don&apos;t have an account?{" "}
              <HeroLink as={Link} href="/signup" size="sm">
                Sign Up
              </HeroLink>
            </p>
            <p className="text-center text-sm text-default-500">
              Need to verify your email?{" "}
              <HeroLink as={Link} href="/verify" size="sm">
                Verify Email
              </HeroLink>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
