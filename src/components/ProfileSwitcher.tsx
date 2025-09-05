
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import { useAuth } from '@/hooks/useAuth';
import { Users, User } from 'lucide-react';

const ProfileSwitcher = () => {
  const { user } = useAuth();
  const { 
    activeUserId, 
    isActingOnBehalf, 
    accessibleUsers, 
    switchToUser 
  } = useActiveUser();

  if (!user || accessibleUsers.length === 0) return null;

  // Filter out users where only food_list permission is granted
  const switchableUsers = accessibleUsers.filter(accessibleUser => {
    const permissions = accessibleUser.permissions;
    if (!permissions || typeof permissions !== 'object') return true;
    
    const hasOnlyFoodList = permissions.food_list && 
      !permissions.calorie && 
      !permissions.checkin && 
      !permissions.reports;
    return !hasOnlyFoodList;
  });

  if (switchableUsers.length === 0) return null;

  return (
    <Select value={activeUserId || user.id} onValueChange={switchToUser}>
      <SelectTrigger className="w-auto h-9 p-2 border-none bg-transparent hover:bg-accent">
        <Users className="h-4 w-4" />
        {isActingOnBehalf && (
          <div className="w-2 h-2 bg-blue-500 rounded-full ml-1" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={user.id}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Your Profile</span>
          </div>
        </SelectItem>
        {switchableUsers.map((accessibleUser) => (
          <SelectItem key={accessibleUser.user_id} value={accessibleUser.user_id}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{accessibleUser.full_name || accessibleUser.email}</span>
              <span className="text-xs text-gray-500">
                (Family)
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ProfileSwitcher;
