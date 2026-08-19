import React from 'react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface IconResolverProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconResolver: React.FC<IconResolverProps> = ({ name, className = 'w-4 h-4', size }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as Record<string, any>)[name] as LucideIcon | undefined;

  if (!IconComponent) {
    return <Icons.FileText className={className} size={size} />;
  }

  return <IconComponent className={className} size={size} />;
};
