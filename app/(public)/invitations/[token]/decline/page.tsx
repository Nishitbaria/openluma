import { eq } from "drizzle-orm";
import { MailX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Decline invitation",
};

export default async function DeclineInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await db.query.invitations.findFirst({
    columns: { eventId: true, status: true },
    where: eq(invitations.token, token),
    with: { event: { columns: { title: true } } },
  });

  if (!invitation) {
    redirect("/invitation-error?reason=invalid");
  }
  if (invitation.status !== "pending") {
    redirect(
      `/invitation-error?reason=already-${invitation.status}&event=${invitation.eventId}`
    );
  }

  const apiUrl = `/api/invitations/${encodeURIComponent(token)}`;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-24 text-center">
      <MailX className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 font-bold text-2xl">Decline invitation?</h1>
      <p className="mt-2 text-muted-foreground">
        You won't be able to attend {invitation.event.title} unless the host
        invites you again.
      </p>
      <form
        action={apiUrl}
        className="mt-8 flex justify-center gap-3"
        method="post"
      >
        <Button asChild variant="outline">
          <Link href={`${apiUrl}?action=accept`} prefetch={false}>
            Accept instead
          </Link>
        </Button>
        <Button type="submit">Decline invitation</Button>
      </form>
    </div>
  );
}
