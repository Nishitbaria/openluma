"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { AuthDivider } from "@/components/auth-divider";
import { AtSignIcon, LockIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      toast.error(error.message ?? "Failed to sign in");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="relative w-full overflow-hidden md:h-screen">
      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-between p-6 md:p-8",
        )}
      >
        <div className="flex justify-center">
          <Link href="/">
            <Logo className="h-4.5" />
          </Link>
        </div>

        <div className="fade-in slide-in-from-bottom-4 w-full animate-in space-y-4 duration-600">
          <div className="flex flex-col space-y-1">
            <h1 className="font-bold text-2xl tracking-wide">Welcome back!</h1>
            <p className="text-base text-muted-foreground">
              Sign in to your OpenLuma account.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <InputGroup>
              <InputGroupInput
                placeholder="your.email@example.com"
                type="email"
                name="email"
                required
              />
              <InputGroupAddon align="inline-start">
                <AtSignIcon />
              </InputGroupAddon>
            </InputGroup>

            <InputGroup>
              <InputGroupInput
                placeholder="Password"
                type="password"
                name="password"
                required
              />
              <InputGroupAddon align="inline-start">
                <LockIcon />
              </InputGroupAddon>
            </InputGroup>

            <Button
              className="w-full"
              size="sm"
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {loading ? "Signing in..." : "Continue With Email"}
            </Button>
          </form>
          <AuthDivider>OR CONTINUE WITH</AuthDivider>
          <div className="space-y-2">
            <Button
              className="w-full"
              type="button"
              variant="outline"
              onClick={async () => {
                await authClient.signIn.social({
                  provider: "google",
                  callbackURL: callbackUrl,
                });
              }}
            >
              <GoogleIcon data-icon="inline-start" />
              Google
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground text-xs">
          By continuing, you agree to our{" "}
          <a
            className="underline underline-offset-4 hover:text-primary"
            href="#"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            className="underline underline-offset-4 hover:text-primary"
            href="#"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);
