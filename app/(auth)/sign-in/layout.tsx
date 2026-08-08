import type { Metadata } from "next";

// `(auth)/layout.tsx` and the sign-in page are both client components and so
// cannot export metadata; this server leaf layout carries it instead.
export const metadata: Metadata = {
  description: "Sign in to your OpenLuma account.",
  robots: { follow: false, index: false },
  title: "Sign in",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
