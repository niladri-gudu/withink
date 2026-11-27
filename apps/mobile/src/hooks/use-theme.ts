import { useAppearance } from '@/providers/appearance-provider';

/** The resolved theme for the active palette, accent, typography and scheme. */
export function useTheme() {
  return useAppearance().theme;
}
