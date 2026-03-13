import "./studio.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Changa+One:ital@0;1"
      />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <link rel="apple-touch-icon" sizes="128x128" href="/logo/128.png" />
      <link
        rel="icon"
        type="image/png"
        sizes="128x128"
        href="/logo/128.png"
      />
      <meta name="msapplication-TileImage" content="/logo/512.png" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="theme-color" content="#000000" />
      <link rel="manifest" href="/manifest.json" />
      <meta
        name="viewport"
        content="width=device-width, viewport-fit=cover, user-scalable=no, initial-scale=1, minimal-ui"
      />
      {children}
    </>
  );
}
