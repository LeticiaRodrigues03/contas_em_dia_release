// AdMob configuration. App IDs live in app.json (config plugin); ad unit IDs are here.
// These are public identifiers (they ship inside the APK/IPA) — not secrets.
import { Platform } from "react-native";

const PROD_BANNER_ANDROID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID ?? "ca-app-pub-2657624729248606/9888713206";
const PROD_BANNER_IOS = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? "ca-app-pub-2657624729248606/5187225872";

// Official Google demo units — used automatically in development builds (__DEV__), never in release.
const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";

export function bannerUnitId(): string {
  if (__DEV__) return Platform.OS === "ios" ? TEST_BANNER_IOS : TEST_BANNER_ANDROID;
  return Platform.OS === "ios" ? PROD_BANNER_IOS : PROD_BANNER_ANDROID;
}
