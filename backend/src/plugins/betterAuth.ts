import type { BetterAuthOptions, betterAuth } from "better-auth"
import { toNodeHandler } from "better-auth/node"
import type { FastifyInstance, FastifyReply } from "fastify"
import fastifyPlugin from "fastify-plugin"

const kAuth = Symbol("betterAuth")

type HttpHeaders = Partial<ReturnType<FastifyReply["getHeaders"]>>

/**
 * Maps Fastify headers to standard Headers object for BetterAuth
 * @internal
 */
function mapHeaders(fastifyHeaders: HttpHeaders): Headers {
  const headers = new Headers()
  Object.entries(fastifyHeaders).forEach(([key, value]) => {
    if (value) headers.append(key, value.toString())
  })

  return headers
}

type BetterAuthInstance<AuthOptions extends BetterAuthOptions> = ReturnType<
  typeof betterAuth<AuthOptions>
>

export type FastifyBetterAuthOptions<
  AuthOptions extends BetterAuthOptions = BetterAuthOptions,
> = {
  auth: BetterAuthInstance<AuthOptions>
}

/**
 * Gets the BetterAuth instance from the Fastify decorator
 * @param fastify Fastify instance
 * @returns BetterAuth instance
 */
export function getAuthDecorator<
  AuthOptions extends BetterAuthOptions = BetterAuthOptions,
>(fastify: FastifyInstance): BetterAuthInstance<AuthOptions> {
  return fastify.getDecorator(kAuth)
}

/**
 * Fastify plugin for Better Auth
 * Decorates the Fastify instance with auth and registers auth routes
 */
export const registerBetterAuth = fastifyPlugin(
  async (fastify: FastifyInstance, options: FastifyBetterAuthOptions) => {
    // Decorate Fastify instance with auth
    fastify.decorate(kAuth, options.auth)

    // Register auth routes in a nested context to isolate the content-type parser
    await fastify.register(async (fastify) => {
      const authHandler = toNodeHandler(options.auth)

      // BetterAuth handles JSON parsing internally via toNodeHandler
      // This parser prevents Fastify from consuming the request body
      fastify.addContentTypeParser(
        "application/json",
        (_request, _payload, done) => {
          done(null, null)
        }
      )

      // BetterAuth default base path is `/v1/auth`, but it can be overridden in the options
      const authBasePath = options.auth.options.basePath ?? "/v1/auth"

      // Register the auth route handler
      fastify.all(`${authBasePath}/*`, async (request, reply) => {
        reply.raw.setHeaders(mapHeaders(reply.getHeaders()))
        await authHandler(request.raw, reply.raw)
      })
    })

    fastify.log.info(
      `✓ Better Auth initialized at ${options.auth.options.basePath ?? "/v1/auth"}`
    )
  }
)
