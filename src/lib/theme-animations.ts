export const createSnowflakesAnimation = (density: 'low' | 'medium' | 'high', color: string = '#FFFFFF') => {
  const counts = { low: 30, medium: 50, high: 80 };
  const count = counts[density];

  const snowflakes = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 10 + Math.random() * 20,
    animationDelay: Math.random() * 20,
    fontSize: 10 + Math.random() * 20,
    opacity: 0.3 + Math.random() * 0.7,
  }));

  return snowflakes;
};

export const createPumpkinsAnimation = (density: 'low' | 'medium' | 'high', color: string = '#FF6600') => {
  const counts = { low: 10, medium: 20, high: 35 };
  const count = counts[density];

  const pumpkins = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 15 + Math.random() * 25,
    animationDelay: Math.random() * 15,
    fontSize: 15 + Math.random() * 25,
    opacity: 0.2 + Math.random() * 0.5,
  }));

  return pumpkins;
};

export const createFireworksAnimation = (density: 'low' | 'medium' | 'high', color: string = '#FFD700') => {
  const counts = { low: 8, medium: 15, high: 25 };
  const count = counts[density];

  const fireworks = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 90 + 5,
    top: Math.random() * 70 + 10,
    animationDuration: 2 + Math.random() * 3,
    animationDelay: Math.random() * 5,
    scale: 0.5 + Math.random() * 1,
  }));

  return fireworks;
};

export const createDiyasAnimation = (density: 'low' | 'medium' | 'high', color: string = '#FFEB3B') => {
  const counts = { low: 12, medium: 20, high: 35 };
  const count = counts[density];

  const diyas = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 8 + Math.random() * 12,
    animationDelay: Math.random() * 10,
    fontSize: 15 + Math.random() * 20,
    opacity: 0.4 + Math.random() * 0.6,
  }));

  return diyas;
};

export const createHeartsAnimation = (density: 'low' | 'medium' | 'high', color: string = '#FF69B4') => {
  const counts = { low: 15, medium: 25, high: 40 };
  const count = counts[density];

  const hearts = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 8 + Math.random() * 15,
    animationDelay: Math.random() * 12,
    fontSize: 12 + Math.random() * 20,
    opacity: 0.3 + Math.random() * 0.6,
  }));

  return hearts;
};
