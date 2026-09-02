import React from 'react';
import * as LucideIcons from 'lucide-react';

interface PageIconProps {
  icon: string;
  className?: string;
}

export const PageIcon: React.FC<PageIconProps> = ({ icon, className = "w-4 h-4" }) => {
  // @ts-ignore
  const IconComponent = LucideIcons[icon];
  
  if (!IconComponent) {
    return <LucideIcons.FileText className={className} />;
  }

  return <IconComponent className={className} />;
};
