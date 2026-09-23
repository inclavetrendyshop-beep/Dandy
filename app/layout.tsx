import "./globals.css";
import Splash from "./components/Splash";

export const metadata = {
  title: "Dandy",
  description: "Conecta con hombres sofisticados cerca de ti",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Splash />
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>{children}</div>
      </body>
    </html>
  );
}

