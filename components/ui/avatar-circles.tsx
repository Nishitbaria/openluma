import {
  Avatar,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"

interface AvatarData {
  imageUrl: string
  profileUrl: string
}
interface AvatarCirclesProps {
  className?: string
  numPeople?: number
  avatarUrls: AvatarData[]
}

export const AvatarCircles = ({
  numPeople,
  className,
  avatarUrls,
}: AvatarCirclesProps) => {
  return (
    <AvatarGroup className={className}>
      {avatarUrls.map((url, index) => (
        <a
          key={url.profileUrl}
          href={url.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Avatar size="lg">
            <AvatarImage src={url.imageUrl} alt={`Avatar ${index + 1}`} />
          </Avatar>
        </a>
      ))}
      {(numPeople ?? 0) > 0 && <AvatarGroupCount>+{numPeople}</AvatarGroupCount>}
    </AvatarGroup>
  )
}
