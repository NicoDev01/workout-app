import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "de.nico.workout",
  appName: "Workout",
  webDir: "dist",
  android: {
    backgroundColor: "#ffffff",
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "LIGHT",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_timer",
      iconColor: "#F26B1D",
    },
  },
}

export default config
