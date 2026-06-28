import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { janIARouter } from "./routers/janIA";
import { githubRouter } from "./routers/github";
import { imagesRouter } from "./routers/images";
import { agentRouter } from "./routers/agent";
import { leadsRouter } from "./routers/leads";
import { propertiesRouter } from "./routers/properties";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { upsertUser, getUserByOpenId } from "./db";
import { sdk } from "./_core/sdk";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const appRouter = router({
  system: systemRouter,
  agent: agentRouter,
  leads: leadsRouter,
  properties: propertiesRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    loginWithSupabaseToken: publicProcedure
      .input(z.object({ accessToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const supabaseUrl = process.env.VITE_SUPABASE_URL;
          console.log("[Auth] VITE_SUPABASE_URL configured:", !!supabaseUrl);
          if (!supabaseUrl) {
            throw new Error("VITE_SUPABASE_URL is not configured on server");
          }

          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              apikey: process.env.VITE_SUPABASE_ANON_KEY || "",
            },
          });

          if (!response.ok) {
            const text = await response.text();
            console.error("[Auth] Supabase validation failed:", response.status, text);
            throw new Error("Invalid Supabase token");
          }

          const userData = await response.json();
          const email = userData.email;
          const openId = userData.id;
          const name = userData.user_metadata?.full_name || userData.user_metadata?.name || email.split("@")[0];

          const signedInAt = new Date();
          await upsertUser({
            openId,
            name,
            email,
            loginMethod: "supabase",
            lastSignedIn: signedInAt,
          });

          const user = await getUserByOpenId(openId);
          if (!user) {
            throw new Error("Failed to retrieve user after upsert");
          }

          const sessionToken = await sdk.createSessionToken(openId, {
            name: name,
            expiresInMs: ONE_YEAR_MS,
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          return {
            success: true,
            user,
          };
        } catch (error) {
          console.error("[Auth] loginWithSupabaseToken error:", error);
          throw error;
        }
      }),
  }),
  janIA: janIARouter,
  github: githubRouter,
  images: imagesRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
