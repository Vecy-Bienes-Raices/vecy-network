import express, { type Express, type Request } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { injectOpenGraphMeta, resolveOpenGraphMeta } from "./ogMetaService";

function extractRequestMetaParams(req: Request) {
  const host =
    (typeof req.headers["x-forwarded-host"] === "string" ? req.headers["x-forwarded-host"] : undefined) ||
    req.headers.host ||
    "vecygroup.com";
  const protocol =
    (typeof req.headers["x-forwarded-proto"] === "string" ? req.headers["x-forwarded-proto"].split(",")[0].trim() : undefined) ||
    req.protocol ||
    "https";
  const rawUrl = req.originalUrl || req.url || "/";
  const [pathname, search = ""] = rawUrl.split("?");
  return { host, protocol, pathname, search };
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const ogMeta = await resolveOpenGraphMeta(extractRequestMetaParams(req));
      template = injectOpenGraphMeta(template, ogMeta);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // index: false permite que '/' pase por el handler dinámico de OpenGraph
  app.use(express.static(distPath, { index: false }));

  let cachedIndexHtml: string | null = null;
  const indexHtmlPath = path.resolve(distPath, "index.html");

  // fall through to index.html con meta tags OpenGraph dinámicos
  app.use("*", async (req, res) => {
    try {
      if (!cachedIndexHtml && fs.existsSync(indexHtmlPath)) {
        cachedIndexHtml = await fs.promises.readFile(indexHtmlPath, "utf-8");
      }
      if (!cachedIndexHtml) {
        return res.status(404).send("index.html no encontrado");
      }
      const ogMeta = await resolveOpenGraphMeta(extractRequestMetaParams(req));
      const rendered = injectOpenGraphMeta(cachedIndexHtml, ogMeta);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(rendered);
    } catch {
      return res.sendFile(indexHtmlPath);
    }
  });
}
