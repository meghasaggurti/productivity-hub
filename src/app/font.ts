// src/app/fonts.ts
import { Spectral } from "next/font/google";

export const spectral = Spectral({
  subsets: ["latin"],
  weight: ["200","300","400","500","600","700","800"],
  style: ["normal","italic"],
  variable: "--font-spectral",
  display: "swap",
});
