import { useSeasonalThemeContext } from './SeasonalThemeProvider';
import {
  createSnowflakesAnimation,
  createPumpkinsAnimation,
  createFireworksAnimation,
  createDiyasAnimation,
  createHeartsAnimation,
} from '@/lib/theme-animations';

export const ThemeDecorations = () => {
  const { activeTheme, isThemeActive } = useSeasonalThemeContext();

  if (!isThemeActive || !activeTheme) return null;

  const { animations } = activeTheme.theme_config;
  const animationColor = animations.color || '#FFFFFF';

  const renderAnimations = () => {
    switch (animations.type) {
      case 'snowflakes': {
        const snowflakes = createSnowflakesAnimation(animations.density, animationColor);
        return snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute pointer-events-none"
            style={{
              left: `${flake.left}%`,
              top: '-10px',
              fontSize: `${flake.fontSize}px`,
              opacity: flake.opacity,
              animation: `fall ${flake.animationDuration}s linear infinite`,
              animationDelay: `${flake.animationDelay}s`,
              color: animationColor,
            }}
          >
            ❄️
          </div>
        ));
      }

      case 'pumpkins': {
        const pumpkins = createPumpkinsAnimation(animations.density, animationColor);
        return pumpkins.map((pumpkin) => (
          <div
            key={pumpkin.id}
            className="absolute pointer-events-none"
            style={{
              left: `${pumpkin.left}%`,
              top: '-10px',
              fontSize: `${pumpkin.fontSize}px`,
              opacity: pumpkin.opacity,
              animation: `fall ${pumpkin.animationDuration}s linear infinite, sway 3s ease-in-out infinite`,
              animationDelay: `${pumpkin.animationDelay}s`,
            }}
          >
            🎃
          </div>
        ));
      }

      case 'fireworks': {
        const fireworks = createFireworksAnimation(animations.density, animationColor);
        return fireworks.map((firework) => (
          <div
            key={firework.id}
            className="absolute pointer-events-none"
            style={{
              left: `${firework.left}%`,
              top: `${firework.top}%`,
              animation: `burst ${firework.animationDuration}s ease-out infinite`,
              animationDelay: `${firework.animationDelay}s`,
              transform: `scale(${firework.scale})`,
            }}
          >
            <span className="text-2xl">🎆</span>
          </div>
        ));
      }

      case 'diyas': {
        const diyas = createDiyasAnimation(animations.density, animationColor);
        return diyas.map((diya) => (
          <div
            key={diya.id}
            className="absolute pointer-events-none"
            style={{
              left: `${diya.left}%`,
              bottom: '-10px',
              fontSize: `${diya.fontSize}px`,
              opacity: diya.opacity,
              animation: `float ${diya.animationDuration}s ease-in-out infinite`,
              animationDelay: `${diya.animationDelay}s`,
            }}
          >
            🪔
          </div>
        ));
      }

      case 'hearts': {
        const hearts = createHeartsAnimation(animations.density, animationColor);
        return hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute pointer-events-none"
            style={{
              left: `${heart.left}%`,
              bottom: '-10px',
              fontSize: `${heart.fontSize}px`,
              opacity: heart.opacity,
              animation: `float ${heart.animationDuration}s ease-in-out infinite`,
              animationDelay: `${heart.animationDelay}s`,
              color: animationColor,
            }}
          >
            💕
          </div>
        ));
      }

      default:
        return null;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
          }

          @keyframes sway {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(20px); }
          }

          @keyframes burst {
            0% { transform: scale(0) rotate(0deg); opacity: 1; }
            50% { transform: scale(1) rotate(180deg); opacity: 1; }
            100% { transform: scale(0) rotate(360deg); opacity: 0; }
          }

          @keyframes float {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(-100vh) rotate(360deg); }
          }
        `}
      </style>

      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {renderAnimations()}
      </div>
    </>
  );
};
