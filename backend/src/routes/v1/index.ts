import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { registerUserRoutes } from "./users.js"
import { registerPreferenceRoutes } from "./preferences.js"
import { registerToolRoutes } from "./tools.js"
import { registerProjectRoutes } from "./project.js"
import { registerTaskRoutes } from "./tasks.js"

export const registerV1Routes = fastifyPlugin(async (app: FastifyInstance) => {
  await app.register(registerProjectRoutes, { prefix: "/v1/projects" })
  await app.register(registerUserRoutes, { prefix: "/v1/users" })
  await app.register(registerPreferenceRoutes, { prefix: "/v1/preferences" })
  await app.register(registerToolRoutes, { prefix: "/v1/tools" })
  await app.register(registerTaskRoutes, { prefix: "/v1/tasks" })
})
