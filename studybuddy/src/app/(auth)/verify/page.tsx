"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Link as HeroLink } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { verifyEmail, resendVerification, signIn } = useAuth();
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await verifyEmail(email, code);
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    setError("");
    try {
      await resendVerification(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-default-500 text-sm">
            Enter the verification code sent to your email
          </p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleVerify} className="space-y-4">
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
            <Input
              label="Verification Code"
              placeholder="Enter the code from your email"
              value={code}
              onValueChange={setCode}
              isRequired
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
              isDisabled={!code.trim() || !email.trim() || !password.trim()}
            >
              Verify & Sign In
            </Button>
            <p className="text-center text-sm text-default-500">
              Didn&apos;t receive the code?{" "}
              <HeroLink size="sm" onPress={handleResend} className="cursor-pointer">
                Resend
              </HeroLink>
            </p>
            <p className="text-center text-sm text-default-500">
              <HeroLink as={Link} href="/signup" size="sm">
                Back to Sign Up
              </HeroLink>
              {" | "}
              <HeroLink as={Link} href="/login" size="sm">
                Sign In
              </HeroLink>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
