const mapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

const androidPackage = process.env.EXPO_ANDROID_PACKAGE || process.env.ANDROID_PACKAGE;
const iosBundleId = process.env.EXPO_IOS_BUNDLE_ID || process.env.IOS_BUNDLE_ID;

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(iosBundleId ? { bundleIdentifier: iosBundleId } : {}),
    config: {
      ...(config.ios?.config || {}),
      ...(mapsApiKey
        ? {
            googleMapsApiKey: mapsApiKey,
          }
        : {}),
    },
  },
  android: {
    ...config.android,
    ...(androidPackage ? { package: androidPackage } : {}),
    config: {
      ...(config.android?.config || {}),
      ...(mapsApiKey
        ? {
            googleMaps: {
              apiKey: mapsApiKey,
            },
          }
        : {}),
    },
  },
});
