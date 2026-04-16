import { ThemeConfig } from '@/hooks/useSeasonalTheme';

interface ThemePreviewProps {
  themeConfig: ThemeConfig;
}

export const ThemePreview = ({ themeConfig }: ThemePreviewProps) => {
  const { colors, decorations, greeting } = themeConfig;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="h-12 flex items-center px-4"
        style={{
          background: colors.headerOverlay || `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
        }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {decorations.logoOverlay || '🏢'}
          </div>
          <span className="text-white font-semibold">Company Name</span>
        </div>
      </div>

      <div className="p-6 bg-background">
        {greeting && (
          <div className="mb-4 p-4 rounded-lg bg-secondary text-secondary-foreground">
            <p className="text-sm font-medium">{greeting}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-md"
              style={{ backgroundColor: colors.primary }}
            />
            <div>
              <p className="text-xs text-muted-foreground">Primary Color</p>
              <p className="text-sm font-mono">{colors.primary}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-md"
              style={{ backgroundColor: colors.accent }}
            />
            <div>
              <p className="text-xs text-muted-foreground">Accent Color</p>
              <p className="text-sm font-mono">{colors.accent}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
