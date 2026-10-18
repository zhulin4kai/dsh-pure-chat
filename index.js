/**
 * DSH-对话区（Host）
 *
 * 功能：按 chat preset 创建不绑定工作区的对话会话；按会话持久化人格并注入
 * Agent；提供创建、重命名、删除会话的 Host 路由。
 *
 * 修改 DSH：通过 cordis.patch.yml 注册 chat Agent preset；用 sessionController
 * 创建和重命名会话；在 agent/created 时注入人格并在销毁时清理；用
 * workspaceRegistry 删除会话。
 */

import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'pure-chat'
export const inject = ['webServer', 'sessionController', 'agentPresets', 'systemPrompt', 'agents', 'workspaceRegistry']

const ROUTE = '/pure-chat'
const PURE_CHAT_PRESET = 'chat'
const STORE_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'pure-chat')
const STORE_FILE = join(STORE_DIR, 'personas.json')
const DEFAULT_PERSONA = '你是一个乐于助人的对话助手。你没有工具，不能访问文件或终端；请直接回答问题。'
const MAX_BODY_BYTES = 131072
const MAX_PERSONA_CHARS = 65536

const personas = new Map()
const agentCleanups = new Map()
let writeChain = Promise.resolve()

function loadPersonas() {
  try {
    const parsed = JSON.parse(readFileSync(STORE_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    for (const [sessionId, text] of Object.entries(parsed)) {
      if (typeof text === 'string' && text.length > 0) personas.set(sessionId, text)
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') console.error('pure-chat: failed to read personas', error)
  }
}

function personaOf(sessionId) {
  return personas.get(sessionId) ?? DEFAULT_PERSONA
}

function isDefaultPersona(sessionId) {
  return !personas.has(sessionId)
}

async function persistPersonas() {
  await mkdir(STORE_DIR, { recursive: true })
  const payload = JSON.stringify(Object.fromEntries(personas), null, 2)
  const temporary = `${STORE_FILE}.${process.pid}.tmp`
  await writeFile(temporary, payload, 'utf8')
  await rename(temporary, STORE_FILE)
}

function savePersona(sessionId, text) {
  if (text.length === 0) personas.delete(sessionId)
  else personas.set(sessionId, text)
  writeChain = writeChain.then(persistPersonas, persistPersonas)
  return writeChain
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    request.on('error', reject)
  })
}

function respondJson(response, status, value) {
  if (response.writableEnded) return
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

function sessionIdOf(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw Object.assign(new TypeError('sessionId must be a non-empty string.'), { status: 400 })
  }
  return value.trim()
}

async function inspectSession(ctx, sessionId) {
  const inspection = await ctx.sessionController.inspect(sessionId)
  if (!inspection?.meta) {
    throw Object.assign(new Error('Session not found.'), { status: 404 })
  }
  return inspection
}

async function assertPureChat(ctx, sessionId) {
  const inspection = await inspectSession(ctx, sessionId)
  if (inspection.meta.agentPreset !== PURE_CHAT_PRESET) {
    throw Object.assign(new Error('This session is not a pure chat session.'), {
      status: 400,
      code: 'not-pure-chat',
    })
  }
  return inspection
}

async function createSession(ctx) {
  const created = await ctx.sessionController.create({
    cwd: homedir(),
    agentPreset: PURE_CHAT_PRESET,
  })
  return created.sessionId
}

async function handleRoute(ctx, request, response) {
  const url = new URL(request.url || ROUTE, 'http://pure-chat.local')
  const pathname = url.pathname.replace(/\/+$/, '')

  try {
    if (request.method === 'GET' && (pathname === ROUTE || pathname === `${ROUTE}/status`)) {
      respondJson(response, 200, { ok: true, plugin: 'dsh-plugin-pure-chat' })
      return
    }

    if (request.method === 'GET' && pathname === `${ROUTE}/persona`) {
      const sessionId = sessionIdOf(url.searchParams.get('sessionId'))
      await assertPureChat(ctx, sessionId)
      respondJson(response, 200, {
        ok: true,
        persona: personaOf(sessionId),
        defaultPersona: DEFAULT_PERSONA,
        isDefault: isDefaultPersona(sessionId),
      })
      return
    }

    if (request.method === 'POST' && pathname === `${ROUTE}/persona`) {
      const body = (await readJson(request)) || {}
      const sessionId = sessionIdOf(body.sessionId)
      if (typeof body.text !== 'string') {
        throw Object.assign(new TypeError('text must be a string.'), { status: 400 })
      }
      const text = body.text.trim()
      if (text.length > MAX_PERSONA_CHARS) {
        throw Object.assign(new Error('Persona text is too long.'), { status: 413 })
      }
      await assertPureChat(ctx, sessionId)
      await savePersona(sessionId, text)
      respondJson(response, 200, {
        ok: true,
        persona: personaOf(sessionId),
        isDefault: isDefaultPersona(sessionId),
      })
      return
    }

    if (request.method === 'POST' && pathname === `${ROUTE}/create`) {
      const sessionId = await createSession(ctx)
      respondJson(response, 200, { ok: true, sessionId })
      return
    }

    if (request.method === 'POST' && pathname === `${ROUTE}/rename`) {
      const body = (await readJson(request)) || {}
      const sessionId = sessionIdOf(body.sessionId)
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) {
        throw Object.assign(new TypeError('title must be a non-empty string.'), { status: 400 })
      }
      await assertPureChat(ctx, sessionId)
      await ctx.sessionController.rename({ sessionId, title })
      respondJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'POST' && pathname === `${ROUTE}/delete`) {
      const body = (await readJson(request)) || {}
      const sessionId = sessionIdOf(body.sessionId)
      await assertPureChat(ctx, sessionId)
      const agent = typeof ctx.agents?.get === 'function' ? ctx.agents.get(sessionId) : undefined
      if (agent) {
        try {
          await agent.cancel({ kind: 'user' })
        } catch {
          // The session may already be idle.
        }
      }
      try {
        if (typeof ctx.workspaceRegistry?.permanentlyDeleteSession === 'function') {
          await ctx.workspaceRegistry.permanentlyDeleteSession(sessionId)
        } else {
          await ctx.workspaceRegistry.archiveSession(sessionId)
        }
      } catch {
        await ctx.workspaceRegistry.archiveSession(sessionId)
      }
      respondJson(response, 200, { ok: true })
      return
    }

    respondJson(response, 404, { ok: false, error: `Not found: ${url.pathname}` })
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500
    const message = error instanceof Error ? error.message : String(error)
    if (status >= 500) console.error('pure-chat: request failed', error)
    respondJson(response, status, { ok: false, code: error?.code, error: message })
  }
}

function presetOf(ctx, agent) {
  try {
    return ctx.agentPresets.composedPreset(agent.ctx)
  } catch {
    return undefined
  }
}

function registerAgent(agent) {
  if (!agent?.ctx || agentCleanups.has(agent.id)) return
  let dispose
  try {
    dispose = agent.ctx.effect(() => {
      const disposers = []
      try {
        disposers.push(agent.ctx.systemPrompt.variable('chat_persona', () => personaOf(agent.id)))
      } catch (error) {
        console.error('pure-chat: persona variable registration failed', error)
      }
      try {
        const deny = []
        for (const toolName of ['working_directory', 'load_workspace_dependencies']) {
          try {
            if (agent.ctx.tools.get(toolName)) deny.push(toolName)
          } catch {
            // A tool the agent cannot see cannot be denied.
          }
        }
        if (deny.length > 0) {
          disposers.push(agent.ctx.tools.restrict({ deny }))
        }
      } catch (error) {
        console.error('pure-chat: tool restriction failed', error)
      }
      return () => {
        for (const disposer of disposers) {
          try {
            disposer()
          } catch {
            // A disposed registration is already gone.
          }
        }
        agentCleanups.delete(agent.id)
      }
    })
  } catch (error) {
    console.error('pure-chat: agent setup failed', error)
    return
  }
  agentCleanups.set(agent.id, () => {
    try {
      dispose()
    } catch {
      // The agent scope may already be disposed.
    }
    agentCleanups.delete(agent.id)
  })
}

export function apply(ctx) {
  loadPersonas()

  ctx.effect(() => ctx.systemPrompt.variable('chat_persona', () => DEFAULT_PERSONA), 'pure-chat: default persona variable')

  ctx.effect(() => ctx.on('agent/created', async ({ agent }) => {
    try {
      let preset = presetOf(ctx, agent)
      if (!preset) {
        const inspection = await ctx.sessionController.inspect(agent.id)
        preset = inspection?.meta?.agentPreset
      }
      if (preset === PURE_CHAT_PRESET) registerAgent(agent)
    } catch (error) {
      console.error('pure-chat: agent/created handling failed', error)
    }
  }), 'pure-chat: agent setup')

  Promise.resolve().then(async () => {
    try {
      for (const agent of ctx.agents.list()) {
        let preset = presetOf(ctx, agent)
        if (!preset) {
          const inspection = await ctx.sessionController.inspect(agent.id)
          preset = inspection?.meta?.agentPreset
        }
        if (preset === PURE_CHAT_PRESET) registerAgent(agent)
      }
    } catch (error) {
      console.error('pure-chat: live-agent reapply failed', error)
    }
  })

  ctx.effect(() => () => {
    for (const cleanup of [...agentCleanups.values()]) {
      try {
        cleanup()
      } catch {
        // Best-effort cleanup for every registered agent.
      }
    }
    agentCleanups.clear()
  }, 'pure-chat: agent cleanup')

  const webServer = ctx.get('webServer') || ctx.webServer
  if (webServer && typeof webServer.register === 'function') {
    ctx.effect(() => webServer.register({
      kind: 'prefix',
      path: ROUTE,
      handler: (request, response) => {
        handleRoute(ctx, request, response).catch((error) => {
          console.error('pure-chat: route failed', error)
          respondJson(response, 500, { ok: false, error: 'Internal error.' })
        })
      },
    }), 'pure-chat: HTTP route')
  }
}
