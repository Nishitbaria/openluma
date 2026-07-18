import { Column, Row, Section, Text } from "@react-email/components";
import { formatInTimeZone } from "date-fns-tz";

interface EventDetailsProps {
  startTime: Date;
  endTime?: Date | null;
  location?: string | null;
  timezone?: string;
}

function formatWhen(
  startTime: Date,
  endTime: Date | null | undefined,
  timezone: string,
) {
  const date = formatInTimeZone(startTime, timezone, "EEEE, MMMM d, yyyy");
  const start = formatInTimeZone(startTime, timezone, "h:mm a");
  if (endTime) {
    const sameDay =
      formatInTimeZone(startTime, timezone, "yyyy-MM-dd") ===
      formatInTimeZone(endTime, timezone, "yyyy-MM-dd");
    const end = sameDay
      ? formatInTimeZone(endTime, timezone, "h:mm a zzz")
      : formatInTimeZone(endTime, timezone, "MMM d, h:mm a zzz");
    return { date, time: `${start} – ${end}` };
  }
  return {
    date,
    time: `${start} ${formatInTimeZone(startTime, timezone, "zzz")}`,
  };
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <Row className="mb-[14px]">
      <Column className="w-[36px] align-top">
        <table
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          className="h-[36px] w-[36px]"
        >
          <tbody>
            <tr>
              <td className="h-[36px] w-[36px] rounded-[8px] bg-white text-center align-middle text-[16px]">
                {icon}
              </td>
            </tr>
          </tbody>
        </table>
      </Column>
      <Column className="pl-[12px] align-top">
        <Text className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
          {label}
        </Text>
        <Text className="m-0 mt-[2px] text-[15px] font-medium leading-[20px] text-[#18181b]">
          {value}
        </Text>
      </Column>
    </Row>
  );
}

export function EventDetails({
  startTime,
  endTime,
  location,
  timezone = "UTC",
}: EventDetailsProps) {
  const { date, time } = formatWhen(startTime, endTime, timezone);

  return (
    <Section className="rounded-[12px] border border-solid border-[#e4e4e7] bg-[#f4f4f5] p-[20px]">
      <DetailRow icon="📅" label="Date" value={date} />
      <DetailRow icon="🕒" label="Time" value={time} />
      {location ? (
        <DetailRow icon="📍" label="Location" value={location} />
      ) : null}
    </Section>
  );
}
