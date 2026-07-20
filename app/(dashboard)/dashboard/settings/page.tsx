"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences.
        </p>
      </div>

      <ThemeSection />
      <PasswordSection />
      <DangerZone />
    </div>
  );
}

function ThemeSection() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { icon: Sun, label: "Light", value: "light" },
    { icon: Moon, label: "Dark", value: "dark" },
    { icon: Monitor, label: "System", value: "system" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose your preferred theme.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
                theme === t.value
                  ? "border-primary bg-primary/5"
                  : "border-transparent"
              )}
              key={t.value}
              onClick={() => setTheme(t.value)}
              type="button"
            >
              <t.icon className="h-6 w-6" />
              <span className="font-medium text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });

      if (error) {
        toast.error(error.message ?? "Failed to change password");
      } else {
        toast.success("Password changed successfully!");
        (e.target as HTMLFormElement).reset();
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              required
              type="password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              minLength={8}
              name="newPassword"
              required
              type="password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </div>
          <Button disabled={loading} type="submit">
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const userEmail = session?.user?.email ?? "";

  async function handleDelete() {
    if (confirmEmail !== userEmail) {
      toast.error("Email doesn't match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.deleteUser();

      if (error) {
        toast.error(error.message ?? "Failed to delete account");
      } else {
        toast.success("Account deleted");
        router.push("/");
      }
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All your events, RSVPs, and data
                will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>
                Type <strong>{userEmail}</strong> to confirm
              </Label>
              <Input
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Enter your email"
                value={confirmEmail}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button
                disabled={loading || confirmEmail !== userEmail}
                onClick={handleDelete}
                variant="destructive"
              >
                {loading ? "Deleting..." : "Delete My Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
