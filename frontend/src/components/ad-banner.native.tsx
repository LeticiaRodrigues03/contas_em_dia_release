import { useEffect, useState } from "react";
import { View } from "react-native";

import { bannerUnitId } from "@/src/ads-config";
import { makeStyles } from "@/src/theme";

type AdsModule = typeof import("react-native-google-mobile-ads");

// The native module only exists in development/production builds (not in Expo Go).
let ads: AdsModule | null = null;
try {
  ads = require("react-native-google-mobile-ads") as AdsModule;
} catch {
  ads = null;
}

let initPromise: Promise<boolean> | null = null;

/** UMP consent → SDK init, once per app session. Resolves false when ads must not be requested. */
function initAds(): Promise<boolean> {
  if (!ads) return Promise.resolve(false);
  if (!initPromise) {
    const mod = ads;
    initPromise = (async () => {
      let canRequestAds = false;
      try {
        await mod.AdsConsent.gatherConsent();
        ({ canRequestAds } = await mod.AdsConsent.getConsentInfo());
      } catch {
        try {
          ({ canRequestAds } = await mod.AdsConsent.getConsentInfo());
        } catch {
          canRequestAds = false;
        }
      }
      if (!canRequestAds) return false;
      try {
        await mod.default().initialize();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return initPromise;
}

/** Anchored adaptive banner. Renders nothing until an ad is actually loaded, so it never blocks content. */
export function AdBanner({ testID = "ad-banner" }: { testID?: string }) {
  const styles = useStyles();
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void initAds().then((ok) => active && setReady(ok));
    return () => {
      active = false;
    };
  }, []);

  if (!ads || !ready) return null;
  const { BannerAd, BannerAdSize } = ads;

  return (
    <View testID={testID} style={[styles.slot, !loaded && styles.hidden]}>
      <BannerAd
        unitId={bannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  slot: { width: "100%", alignItems: "center", backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border },
  hidden: { height: 0, overflow: "hidden", borderTopWidth: 0 },
}));
