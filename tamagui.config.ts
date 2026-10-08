import { createTamagui, createTokens } from 'tamagui'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/themes'
import { createMedia } from '@tamagui/react-native-media-driver'
import { AppColors } from './constants/colors'

const headingFont = createInterFont()
const bodyFont = createInterFont()

// The screens are built on the $orange1..$orange12 scale. Remap it to the
// same look as the sales app: white pages, black/grey text, grey borders
// and #FF6B00 orange only for actions and highlights.
const brandOrange = {
  orange1: AppColors.background, // page and card background
  orange2: AppColors.surfaceMuted, // inner panels (neutral)
  orange3: AppColors.primaryLight, // light orange tint for selected/highlight
  orange4: AppColors.border, // light grey borders
  orange5: AppColors.border,
  orange6: AppColors.primaryMuted, // orange borders
  orange7: AppColors.borderStrong, // neutral shadows
  orange8: AppColors.primaryGradientEnd,
  orange9: AppColors.primary, // buttons, active elements
  orange10: AppColors.primaryDark, // accents, icons
  orange11: AppColors.textSecondaryStrong, // labels
  orange12: AppColors.textPrimary, // main text
}

const lightTheme = {
  ...themes.light,
  ...brandOrange,
  background: AppColors.surface,
  backgroundHover: AppColors.primaryLight,
  backgroundPress: AppColors.primaryContainer,
  backgroundFocus: AppColors.primaryContainer,
  color: AppColors.textPrimary,
  borderColor: AppColors.border,
  placeholderColor: AppColors.textMuted,
}

export const config = createTamagui({
  defaultFont: 'body',
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  // The app is always white and orange, also when the phone is in dark mode
  themes: { ...themes, light: lightTheme, dark: lightTheme },
  tokens: createTokens({
    ...tokens,
    color: { ...tokens.color, ...brandOrange },
  }),
  shorthands,
  media: createMedia({
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  }),
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
