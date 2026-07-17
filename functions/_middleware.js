// functions/_middleware.js
// Injects partials/header.html into <div id="site-header"></div>
// and partials/footer.html into <div id="site-footer"></div>
// on every HTML response, at the edge, before it reaches the browser.
//
// Edit partials/header.html or partials/footer.html and every page
// that uses <div id="site-header"></div> / <div id="site-footer"></div>
// updates automatically — no per-page copy-paste needed.

class InjectHTML {
  constructor(html) {
    this.html = html;
  }
  element(element) {
    element.setInnerContent(this.html, { html: true });
  }
}

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const url = new URL(context.request.url);

  const [headerRes, footerRes] = await Promise.all([
    context.env.ASSETS.fetch(new URL("/partials/header.html", url.origin)),
    context.env.ASSETS.fetch(new URL("/partials/footer.html", url.origin)),
  ]);

  const [headerHTML, footerHTML] = await Promise.all([
    headerRes.text(),
    footerRes.text(),
  ]);

  return new HTMLRewriter()
    .on("#site-header", new InjectHTML(headerHTML))
    .on("#site-footer", new InjectHTML(footerHTML))
    .transform(response);
}
