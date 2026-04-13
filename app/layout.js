import { Rubik, Karla } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "SiCuti — Sistem Absensi Guru dan Murid",
  description: "Sistem absensi digital untuk TK Karakter Mutiara Bunda Bali",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${rubik.variable} ${karla.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}