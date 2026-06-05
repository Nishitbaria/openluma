"use client";

import { AtSignIcon, Loader2Icon, LockIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthDivider } from "@/components/auth-divider";
import { GoogleIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { MetalButton } from "@/components/ui/metal-button";
import { PixelHeading } from "@/components/ui/pixel-heading-character";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("callbackUrl") ?? "/dashboard";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();
  const gridColor =
    resolvedTheme === "dark" ? "rgb(255,255,255)" : "rgb(0,0,0)";

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
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      >
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.1}
          color={gridColor}
          maxOpacity={0.05}
          className="size-full"
        />
      </div>
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
            <PixelHeading
              as="h1"
              mode="wave"
              autoPlay
              cycleInterval={300}
              staggerDelay={80}
              showLabel={false}
              className="font-bold text-2xl tracking-wide"
            >
              Welcome back!
            </PixelHeading>
            <PixelParagraph
              text="Sign in to your OpenLuma account."
              pixelWords={["OpenLuma"]}
              font="circle"
              pixelWordClassName="text-foreground"
              className="text-base text-muted-foreground"
            />
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

            <MetalButton
              className="w-full"
              metalFxClassName="w-full"
              size="sm"
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {loading ? "Signing in..." : "Continue With Email"}
            </MetalButton>
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
