import { z } from '@hono/zod-openapi';

/**
 * Mirrors cli/src/db/homes.ts Home interface — the one camelCase exception
 * in this API's response envelopes (rowToHome() converts snake_case SQLite
 * columns to camelCase before the route returns them).
 */
export const HomeSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    path: z.string(),
    enabled: z.boolean(),
    createdAt: z.string(),
  })
  .openapi('Home');

export const HomesListResponseSchema = z
  .object({
    homes: z.array(HomeSchema),
  })
  .openapi('HomesListResponse');

export const HomeResponseSchema = z
  .object({
    home: HomeSchema,
  })
  .openapi('HomeResponse');

export const HomeIdParamSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
});
