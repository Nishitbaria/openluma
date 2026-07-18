import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://openluma.vercel.app";

export const brand = {
  ink: "#18181b",
  inkSoft: "#3f3f46",
  muted: "#71717a",
  faint: "#a1a1aa",
  line: "#e4e4e7",
  surface: "#ffffff",
  canvas: "#f4f4f5",
  accentBg: "#f4f4f5",
};

interface EmailLayoutProps {
  preview: string;
  title?: string;
  children: ReactNode;
}

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <title>{title ?? preview}</title>
        </Head>
        <Preview>{preview}</Preview>
        <Body className="m-0 bg-[#f4f4f5] py-[32px] font-sans">
          <Container
            lang="en"
            dir="ltr"
            className="mx-auto w-full max-w-[560px] px-[16px]"
          >
            {/* Brand header */}
            <Section className="pb-[20px] text-center">
              <Link
                href={appUrl}
                className="text-[20px] font-bold tracking-tight text-[#18181b] no-underline"
              >
                Open<span className="text-[#71717a]">Luma</span>
              </Link>
            </Section>

            {/* Card */}
            <Section className="overflow-hidden rounded-[16px] border border-solid border-[#e4e4e7] bg-white">
              {children}
            </Section>

            {/* Footer */}
            <Section className="px-[8px] pt-[24px] text-center">
              <Text className="m-0 text-[12px] leading-[18px] text-[#a1a1aa]">
                You're receiving this email from{" "}
                <Link href={appUrl} className="text-[#71717a] underline">
                  OpenLuma
                </Link>{" "}
                — the open-source event platform.
              </Text>
              <Text className="m-0 mt-[6px] text-[12px] leading-[18px] text-[#a1a1aa]">
                © {new Date().getFullYear()} OpenLuma. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Dark banner used at the top of the card body. */
export function CardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Section className="bg-[#18181b] px-[32px] py-[28px] text-center">
      <Heading
        as="h1"
        className="m-0 text-[22px] font-bold leading-[28px] text-white"
      >
        {title}
      </Heading>
      {subtitle ? (
        <Text className="m-0 mt-[6px] text-[15px] leading-[22px] text-[#d4d4d8]">
          {subtitle}
        </Text>
      ) : null}
    </Section>
  );
}

/** A subtle status pill. */
export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: { bg: string; text: string };
}) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} role="presentation">
      <tbody>
        <tr>
          <td
            className="rounded-full px-[14px] py-[6px] text-[12px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: tone.bg, color: tone.text }}
          >
            {label}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export { appUrl };

/** Divider used inside the card. */
export function CardDivider() {
  return <Hr className="my-[24px] border-solid border-[#e4e4e7]" />;
}
