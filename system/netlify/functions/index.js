// Serves HTML from a template for every landing route on aesthetic.computer.

import https from "https";
import { URLSearchParams } from "url";
import { parse, metadata } from "../../public/aesthetic.computer/lib/parse.mjs";
import { defaultTemplateStringProcessor as html } from "../../public/aesthetic.computer/lib/helpers.mjs";

async function fun(event, context) {
  const dev = process.env.CONTEXT === "dev";
  if (dev) console.log("Node version:", process.version);
  // TODO: Return a 500 or 404 for everything that does not exist...
  //       - [] Like for example if the below import fails...
  if (event.path === "/favicon.ico") return { statusCode: 500 };

  let slug = event.path.slice(1) || "prompt";

  console.log("Path:", event.path, "Host:", event.headers["host"]);

  // Some domains will rewrite the initial slug.
  if (event.headers["host"] === "botce.ac") {
    slug = "botce";
  } else if (
    event.headers["host"] === "m2w2.whistlegraph.com" &&
    event.path.length <= 1
  ) {
    slug = "wg~m2w2";
  }

  const parsed = parse(slug, { hostname: event.headers["host"] });

  if (process.env.CONTEXT === "dev") console.log(slug, parsed);

  // Remote host.
  // TODO: Node currently doesn't support dynamic imports from http/s - 22.07.19.05.25
  //       - Implementation below.
  /*
  let importPath;
  if (slug.startsWith('@')) {
    importPath = `https://${parsed.host}/${parsed.path}.mjs`;
  } else {
    importPath = `../../public/${parsed.path}.mjs`;
  }
  // TODO: Check to see if the path is on this server.
  const { desc } = await import(importPath);
  */

  let meta;

  const redirect = {
    statusCode: 302,
    headers: {
      "Content-Type": "text/html",
      Location: "/" + new URLSearchParams(event.queryStringParameters),
    },
    body: '<a href="https://aesthetic.computer">https://aesthetic.computer</a>',
  };

  // Externally hosted pieces always start with @.
  try {
    if (slug.startsWith("@") && slug.indexOf("/") !== -1) {
      const externalPiece = await getPage(
        `https://${parsed.host}/${parsed.path}.mjs`
      );
      if (externalPiece?.code !== 200) return redirect;
    } else {
      // Locally hosted piece.
      try {
        // Just whitelist freaky-flowers for now 22.11.28.13.36.
        // Also whitelist wg 22.12.25.20.28

        if (
          !parsed.text.startsWith("requestProvider.js.map") &&
          (parsed.text.startsWith("ff") ||
            parsed.text.startsWith("freaky-flowers") ||
            parsed.text.startsWith("wg") ||
            parsed.text.startsWith("prompt") ||
            parsed.text.startsWith("botce") ||
            parsed.text.startsWith("baktok") ||
            parsed.text.startsWith("painting") ||
            parsed.text.startsWith("textfence") ||
            parsed.text.startsWith("valbear") ||
            parsed.text.startsWith("ordfish") ||
            parsed.text === "")
        ) {
          const m = await import(`../../public/${parsed.path}.mjs`);
          meta = m.meta?.(parsed); // Parse any special piece metadata if it exists.
        }
      } catch (e) {
        console.log(e);
      }
    }
  } catch {
    // If either module doesn't load, then we KNOW we won't be able to load
    // the piece, so we can fallback to the main route.
    return redirect;
  }

  // *** Server Metadata Fields***
  const { title, desc, ogImage, icon, twitterImage } = metadata(
    event.headers["host"],
    slug,
    meta
  );

  const assetURI = dev ? "/assets/" : "https://assets.aesthetic.computer/";

  const body = html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link rel="icon" href="${icon}" type="image/png" />
        <link
          rel="stylesheet"
          crossorigin="anonymous"
          href="/type/webfonts/berkeley-mono-variable.css"
        />
        <link
          rel="stylesheet"
          crossorigin="anonymous"
          href="/type/webfonts/ywft-processing-regular.css"
        />
        <link
          rel="stylesheet"
          crossorigin="anonymous"
          href="/aesthetic.computer/style.css"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta name="og:title" content="${title}" />
        <meta name="og:description" content="${desc}" />
        <meta name="og:image" content="${ogImage}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:site" content="aesthetic.computer" />
        <meta name="twitter:image" content="${twitterImage}" />
        <script
          crossorigin="anonymous"
          src="/aesthetic.computer/dep/cdn.auth0.com_js_auth0-spa-js_2.0_auth0-spa-js.production.js"
        ></script>
        ${dev
          ? ""
          : `<!-- <script crossorigin="anonymous" src="https://js.sentry-cdn.com/ef4704c0df6a410e972bca14d69e1898.min.js"></script> -->`}
        <script
          crossorigin="anonymous"
          src="/aesthetic.computer/boot.mjs"
          type="module"
          defer
        ></script>
        <!-- Google tag (gtag.js) -->
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-B4TLVYKXVF"
        ></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag() {
            dataLayer.push(arguments);
          }
          gtag("js", new Date());
          gtag("config", "G-B4TLVYKXVF");
        </script>
      </head>
      <body class="native-cursor">
        <script>
          if (window.self !== window.top) document.body.classList.add("embed");
        </script>
      </body>
    </html>
  `;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    body,
    ttl: 60,
  };
}

async function getPage(url) {
  return new Promise((resolve) => {
    let data = "";
    https
      .get(url, (res) => {
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ data, code: res.statusCode });
        });
      })
      .on("error", (e) => {
        console.log("Error:", e);
        resolve(); // TODO: Should I error here, rather than resolve?
      });
  });
}

export const handler = fun;
