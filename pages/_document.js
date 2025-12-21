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
        <link rel="icon" href="https://Domain/assets/Logo" />
        <title>Title Content</title>

        <meta name="title" content="Title Content" />
        <meta name="description" content="Description Content" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://Domain/assets/FileName" />
        <meta property="og:title" content="Title Content" />
        <meta property="og:description" content="Description Content" />
        <meta property="og:image" content="https://Domain/assets/FileName" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://Domain/assets/FileName" />
        <meta property="twitter:title" content="Title Content" />
        <meta property="twitter:description" content="Description Content" />
        <meta
          property="twitter:image"
          content="https://Domain/assets/FileName"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
