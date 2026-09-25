import "./globals.css";
import Splash from "./components/Splash";
import PwaRegister from "./components/PwaRegister";

export const metadata = {
  title: "Dandy",
  description: "Conecta con hombres sofisticados cerca de ti",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PwaRegister />
        <Splash />
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>{children}</div>
      </body>
    </html>
  );
}

