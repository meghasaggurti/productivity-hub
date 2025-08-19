// src/app/fonts.ts
import { Spectral } from "next/font/google";

export const spectral = Spectral({
  subsets: ["latin"],
  // Specify weights & styles to fix the TS "weight required" error
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});
