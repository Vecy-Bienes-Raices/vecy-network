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
