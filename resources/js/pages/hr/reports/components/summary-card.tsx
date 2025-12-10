import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'danger' | 'warning';
}

export function SummaryCard({ title, value, description, icon, accent = 'default' }: SummaryCardProps) {
  const accentClasses: Record<string, string> = {
    default: 'text-muted-foreground',
    success: 'text-emerald-500',
    danger: 'text-destructive',
    warning: 'text-amber-500',
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className={accentClasses[accent]}>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
      </CardContent>
    </Card>
  );
}
