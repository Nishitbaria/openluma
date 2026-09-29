import { Button, Section, Text } from "@react-email/components";
import { CardHeader, EmailLayout } from "./components/email-layout";

interface VerifyEmailProps {
  verifyUrl: string;
}

export default function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Verify your email for OpenLuma">
      <CardHeader subtitle="One more step" title="Verify your email" />

      <Section className="px-[32px] py-[28px]">
        <Text className="m-0 text-[#3f3f46] text-[15px] leading-[24px]">
          Confirm this email address to finish setting up your OpenLuma account.
          The link expires in 1 hour.
        </Text>

        <Section className="mt-[28px]">
          <Button
            className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center font-semibold text-[15px] text-white no-underline"
            href={verifyUrl}
          >
            Verify email
          </Button>
        </Section>

        <Text className="mt-[20px] mb-0 text-[#71717a] text-[13px] leading-[20px]">
          If you didn't create an OpenLuma account, you can ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  verifyUrl: "https://openluma.vercel.app/api/auth/verify-email?token=preview",
} satisfies VerifyEmailProps;
