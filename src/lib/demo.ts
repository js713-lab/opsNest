export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === 'true' || localStorage.getItem('opsnest_demo_mode') === 'true';
};

export const setDemoMode = (enabled: boolean) => {
  localStorage.setItem('opsnest_demo_mode', enabled ? 'true' : 'false');
  window.location.reload();
};

