export interface Env {
  VERCEL_ORIGIN?: string;
}

/**
 * Cloudflare Pages 全站反代中间件。
 *
 * 作用：
 * - `pages.dev` 只作为国内入口
 * - 所有页面和静态资源都转发到 Vercel
 * - 这样 Vercel 一更新，Cloudflare 这边看到的内容也会同步更新
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const vercelOrigin = env.VERCEL_ORIGIN?.trim();

  if (!vercelOrigin) {
    return new Response("Cloudflare 环境变量 VERCEL_ORIGIN 未配置", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const targetOrigin = new URL(vercelOrigin);
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(targetOrigin.toString());

  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;

  const proxyRequest = new Request(targetUrl.toString(), request);
  const response = await fetch(proxyRequest);

  const headers = new Headers(response.headers);
  const location = headers.get("location");

  if (location) {
    const resolvedLocation = new URL(location, targetOrigin);

    if (resolvedLocation.origin === targetOrigin.origin) {
      resolvedLocation.protocol = incomingUrl.protocol;
      resolvedLocation.host = incomingUrl.host;
      headers.set("location", resolvedLocation.toString());
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
};
