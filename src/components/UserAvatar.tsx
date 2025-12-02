import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const UserAvatar = ({ 
  avatarUrl, 
  username, 
  email, 
  size = "md",
  className = ""
}: UserAvatarProps) => {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-base"
  };

  const getInitials = () => {
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={avatarUrl || undefined} 
        alt={username || email || 'User'} 
      />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};
