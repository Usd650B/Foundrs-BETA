import { formatDistanceToNow } from 'date-fns';
import { Check, X, Bell, User, MessageSquare, ThumbsUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const iconMap = {
  default: Bell,
  message: MessageSquare,
  reaction: ThumbsUp,
  mention: User,
  team: Users,
};

interface NotificationItemProps {
  id: string;
  type?: keyof typeof iconMap;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  onDismiss?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
}

export const NotificationItem = ({
  id,
  type = 'default',
  title,
  message,
  read,
  timestamp,
  onDismiss,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) => {
  const Icon = iconMap[type] || Bell;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 transition-colors hover:bg-accent/50',
        !read && 'bg-accent/20'
      )}
      onClick={onClick}
    >
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground line-clamp-1">{title}</p>
          <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{message}</p>
        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {onMarkAsRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(id);
              }}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Mark as read
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(id);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
