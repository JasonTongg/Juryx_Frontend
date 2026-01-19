import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;1,300&family=Ubuntu:wght@300&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="./assets/Logo2.png" />
        <title>JURYX</title>

        <meta name="title" content="JURYX" />
        <meta name="description" content="Juryx, a decentralized multi-signature wallet platform" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="JURYX" />
        <meta property="og:description" content="Juryx, a decentralized multi-signature wallet platform" />

        <meta property="twitter:title" content="JURYX" />
        <meta property="twitter:description" content="Juryx, a decentralized multi-signature wallet platform" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
