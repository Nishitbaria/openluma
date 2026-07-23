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
import { getAppUrl } from "@/lib/app-url";

const appUrl = getAppUrl();

export const brand = {
  accentBg: "#f4f4f5",
  canvas: "#f4f4f5",
  faint: "#a1a1aa",
  ink: "#18181b",
  inkSoft: "#3f3f46",
  line: "#e4e4e7",
  muted: "#71717a",
  surface: "#ffffff",
};

interface EmailLayoutProps {
  children: ReactNode;
  preview: string;
  title?: string;
}

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html dir="ltr" lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <title>{title ?? preview}</title>
        </Head>
        <Preview>{preview}</Preview>
        <Body className="m-0 bg-[#f4f4f5] py-[32px] font-sans">
          <Container
            className="mx-auto w-full max-w-[560px] px-[16px]"
            dir="ltr"
            lang="en"
          >
            {/* Brand header */}
            <Section className="pb-[20px] text-center">
              <Link
                className="font-bold text-[#18181b] text-[20px] tracking-tight no-underline"
                href={appUrl}
              >
                Open<span className="text-[#71717a]">Luma</span>
              </Link>
            </Section>

            {/* Card */}
            <Section className="overflow-hidden rounded-[16px] border border-[#e4e4e7] border-solid bg-white">
              {children}
            </Section>

            {/* Footer */}
            <Section className="px-[8px] pt-[24px] text-center">
              <Text className="m-0 text-[#a1a1aa] text-[12px] leading-[18px]">
                You're receiving this email from{" "}
                <Link className="text-[#71717a] underline" href={appUrl}>
                  OpenLuma
                </Link>{" "}
                — the open-source event platform.
              </Text>
              <Text className="m-0 mt-[6px] text-[#a1a1aa] text-[12px] leading-[18px]">
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
        className="m-0 font-bold text-[22px] text-white leading-[28px]"
      >
        {title}
      </Heading>
      {subtitle ? (
        <Text className="m-0 mt-[6px] text-[#d4d4d8] text-[15px] leading-[22px]">
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
    <table border={0} cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td
            className="rounded-full px-[14px] py-[6px] font-semibold text-[12px] uppercase tracking-wide"
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
  return <Hr className="my-[24px] border-[#e4e4e7] border-solid" />;
}
