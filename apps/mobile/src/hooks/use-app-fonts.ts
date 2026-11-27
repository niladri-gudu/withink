import { useFonts } from 'expo-font';
import { Alegreya_400Regular } from '@expo-google-fonts/alegreya';
import { Caveat_400Regular } from '@expo-google-fonts/caveat';
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond';
import { Geist_400Regular } from '@expo-google-fonts/geist';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Literata_400Regular } from '@expo-google-fonts/literata';
import { ShadowsIntoLight_400Regular } from '@expo-google-fonts/shadows-into-light';

/**
 * Registers every curated typography pairing once at startup. The family names
 * match `FONT_FAMILIES` in `constants/theme.ts`; a failed load falls back to
 * the platform face rather than blocking the app.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Alegreya_400Regular,
    Caveat_400Regular,
    CormorantGaramond_400Regular,
    Geist_400Regular,
    GeistMono_400Regular,
    JetBrainsMono_400Regular,
    Literata_400Regular,
    ShadowsIntoLight_400Regular,
  });
  return loaded;
}
