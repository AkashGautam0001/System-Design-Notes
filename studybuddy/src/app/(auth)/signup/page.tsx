"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Link as HeroLink } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signUp(email, password, name);
      router.push("/verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-default-500 text-sm">Join StudyBuddy and start learning</p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSignUp} className="space-y-4">
            <Input
              label="Name"
              placeholder="Enter your name"
              value={name}
              onValueChange={setName}
              isRequired
            />
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
              placeholder="Create a password"
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
              Sign Up
            </Button>
            <p className="text-center text-sm text-default-500">
              Already have an account?{" "}
              <HeroLink as={Link} href="/login" size="sm">
                Sign In
              </HeroLink>
            </p>
            <p className="text-center text-sm text-default-500">
              Already signed up?{" "}
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
