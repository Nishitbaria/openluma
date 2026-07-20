import {
  Avatar,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";

interface AvatarData {
  imageUrl: string;
  profileUrl: string;
}
interface AvatarCirclesProps {
  avatarUrls: AvatarData[];
  className?: string;
  numPeople?: number;
}

export const AvatarCircles = ({
  numPeople,
  className,
  avatarUrls,
}: AvatarCirclesProps) => (
  <AvatarGroup className={className}>
    {avatarUrls.map((url, index) => (
      <a
        href={url.profileUrl}
        key={url.profileUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Avatar size="lg">
          <AvatarImage alt={`Avatar ${index + 1}`} src={url.imageUrl} />
        </Avatar>
      </a>
    ))}
    {(numPeople ?? 0) > 0 && <AvatarGroupCount>+{numPeople}</AvatarGroupCount>}
  </AvatarGroup>
);
