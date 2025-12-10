import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ExportButtonProps {
  exportRoute: string;
  filters: Record<string, any>;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ExportButton({ exportRoute, filters, variant = 'outline', size = 'sm' }: ExportButtonProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    window.location.href = exportRoute + '?' + params.toString();
  };

  return (
    <Button onClick={handleExport} variant={variant} size={size}>
      <Download className="h-4 w-4 mr-2" />
      {t('Export to Excel')}
    </Button>
  );
}
