import type { Metadata } from "next";

// The ticket page is a client component with no layout of its own, so this
// server layout exists purely to keep personal QR tickets out of search
// indexes.
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Your ticket",
};

export default function TicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
