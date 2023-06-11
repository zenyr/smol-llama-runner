import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { IBM_Plex_Sans_KR, Nanum_Gothic_Coding } from "next/font/google";

const normal = IBM_Plex_Sans_KR({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});
const monospace = Nanum_Gothic_Coding({
  display: "optional",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "Smol llama Runner",
  description: "A smol llama.cpp server runner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body className={normal.className}>
        <MantineProvider
          theme={{
            fontFamily:
              "IBM Plex Sans KR, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji",
            fontFamilyMonospace:
              "Nanum Gothic Coding, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
          }}
        >
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
