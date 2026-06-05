"use client";

import { AtSignIcon, Loader2Icon, LockIcon, UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthDivider } from "@/components/auth-divider";
import { GoogleIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { MetalButton } from "@/components/ui/metal-button";
import { PixelHeading } from "@/components/ui/pixel-heading-character";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();
  const gridColor = resolvedTheme === "dark" ? "rgb(255,255,255)" : "rgb(0,0,0)";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      toast.error(error.message ?? "Failed to create account");
      setLoading(false);
      return;
    }

    toast.success("Account created! Redirecting...");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative w-full overflow-hidden md:h-screen">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }}
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
              Join Now!
            </PixelHeading>
            <PixelParagraph
              text="Create your OpenLuma account to get started."
              pixelWords={["OpenLuma"]}
              font="circle"
              pixelWordClassName="text-foreground"
              className="text-base text-muted-foreground"
            />
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <InputGroup>
              <InputGroupInput
                placeholder="Your name"
                type="text"
                name="name"
                required
              />
              <InputGroupAddon align="inline-start">
                <UserIcon />
              </InputGroupAddon>
            </InputGroup>

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
                placeholder="Password (min 8 characters)"
                type="password"
                name="password"
                required
                minLength={8}
              />
              <InputGroupAddon align="inline-start">
                <LockIcon />
              </InputGroupAddon>
            </InputGroup>

            <MetalButton className="w-full" metalFxClassName="w-full" size="sm" type="submit" disabled={loading}>
              {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {loading ? "Creating account..." : "Continue With Email"}
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
                  callbackURL: "/dashboard",
                });
              }}
            >
              <GoogleIcon data-icon="inline-start" />
              Google
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Sign in
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
