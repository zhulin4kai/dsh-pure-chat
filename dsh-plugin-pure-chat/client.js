/**
 * DSH-对话区
 *
 * 功能：在侧边栏顶部提供独立对话区，包含搜索、筛选、新建对话和会话列表；
 * 每个会话可通过“...”菜单编辑人格、重命名、归档、删除。
 *
 * 修改 DSH：包装 sidebar.workspaces 并在原生工作区浏览器前插入对话区；
 * 包装 conversation.composer.bar 和 conversation.hero.workspace 以识别纯对话；
 * 隐藏原生未分组文件夹；分支切换时读取共享的稳定排序时间。
 */

window.__ModuleLoader__.load({
  id: 'dsh-plugin-pure-chat',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const Fragment = React.Fragment

    const ROUTE = '/pure-chat'
    const WRAPPED = Symbol.for('dsh-plugin-pure-chat.wrapped')
    const DEFAULT_PERSONA = '你是一个乐于助人的对话助手。你没有工具，不能访问文件或终端；请直接回答问题。'
    const CLIENT_VERSION = '0.1.8'
    const SIDEBAR_CSS = `
[data-dsh-nw-ungrouped] { display: none !important; }
._7514NG_groupSection:has([data-row-key="workspace:"]) { display: none !important; }
[data-pure-chat] button[aria-label="选择工作区"], [data-pure-chat] button[aria-label="Choose workspace"] { display: none !important; }

.pc-section {
  padding: 0 12px 0 0;
  box-sizing: border-box;
}
.pc-section-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 36px;
  padding: 0 4px;
  margin: 2px -4px 4px 0;
  box-sizing: border-box;
}
.pc-section-title {
  flex: none;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary);
}
.pc-section-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  margin-left: auto;
}
.pc-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.pc-icon-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.pc-icon-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: -2px;
}
.pc-icon-btn[data-active="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.pc-icon-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.pc-search {
  display: flex;
  align-items: center;
  margin: 2px 2px 6px;
}
.pc-search input {
  width: 100%;
  height: 30px;
  box-sizing: border-box;
  padding: 0 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-specific-input-major, var(--dsw-alias-bg-base));
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  outline: none;
}
.pc-search input:focus {
  border-color: var(--dsw-alias-border-l2);
}
.pc-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  box-sizing: border-box;
  padding: 0 4px 0 6px;
  border-radius: 8px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.pc-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.pc-row[data-active="true"] {
  background: var(--dsw-specific-sidebar-nav-item-active);
}
.pc-row-leading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: none;
}
.pc-row-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
}
.pc-row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 20px;
}
.pc-row-time {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.pc-more {
  display: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.pc-row:hover .pc-more,
.pc-row[data-active="true"] .pc-more,
.pc-row:focus-within .pc-more {
  display: inline-flex;
}
.pc-more:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.pc-rename {
  flex: 1;
  min-width: 0;
  height: 24px;
  box-sizing: border-box;
  padding: 0 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-specific-input-major, var(--dsw-alias-bg-base));
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.pc-empty {
  padding: 4px 6px 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.pc-popover {
  position: fixed;
  z-index: 1100;
  min-width: 168px;
  padding: 4px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-panel);
}
.pc-popover-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  box-sizing: border-box;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}
.pc-popover-item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.pc-popover-item[data-danger="true"] {
  color: var(--dsw-alias-state-error-primary);
}
.pc-popover-check {
  width: 14px;
  flex: none;
  color: var(--dsw-alias-label-primary);
  text-align: center;
}
.pc-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5));
}
.pc-modal {
  width: min(360px, 100%);
  padding: 16px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-elevation-panel);
  font-size: 13px;
  line-height: 20px;
}
.pc-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}
.pc-modal-body {
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
.pc-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.pc-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.pc-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.pc-btn[data-danger="true"] {
  border-color: transparent;
  background: var(--dsw-alias-state-error-primary);
  color: #fff;
}
.pc-btn[data-danger="true"]:hover {
  filter: brightness(1.04);
}
.pc-section + [data-slot="sidebar.workspaces"] {
  margin-top: 2px;
}
`

    let pluginCtx = null
    const listeners = new Set()
    const createdPureChatSessions = new Set()
    const pureChatPresetCache = new Map()
    let currentSessionId = null
    const currentSessionListeners = new Set()

    function setCurrentSessionId(sessionId) {
      if (!sessionId || sessionId === currentSessionId) return
      currentSessionId = sessionId
      for (const listener of currentSessionListeners) listener()
    }

    function useCurrentSessionId() {
      const [, force] = React.useState(0)
      React.useEffect(() => {
        const listener = () => force((value) => value + 1)
        currentSessionListeners.add(listener)
        return () => {
          currentSessionListeners.delete(listener)
        }
      }, [])
      return currentSessionId
    }
    const store = {
      open: false,
      sessionId: null,
      persona: '',
      defaultPersona: DEFAULT_PERSONA,
      isDefault: true,
      loaded: false,
      loading: false,
      saving: false,
      error: '',
      status: '',
    }

    function setStore(patch) {
      Object.assign(store, patch)
      for (const listener of listeners) listener()
    }

    function useStore() {
      const [, force] = React.useState(0)
      React.useEffect(() => {
        const listener = () => force((value) => value + 1)
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }, [])
      return store
    }

    function getLocale() {
      try {
        const lang = document.documentElement.lang || navigator.language || 'en'
        return String(lang).toLowerCase().startsWith('zh') ? 'zh' : 'en'
      } catch {
        return 'en'
      }
    }

    function t(zh, en) {
      return getLocale() === 'zh' ? zh : en
    }

    function snapshotOf(service) {
      const source = service && service.list
      if (!source) return { ids: [], byId: {}, current: undefined }
      if (typeof source.getSnapshot === 'function') return source.getSnapshot()
      return source.snapshot || source
    }

    function sessionSnapshot() {
      return snapshotOf(pluginCtx && pluginCtx.sessions)
    }

    function collectPureChatSessionIds(sessions, workspaces) {
      const attached = new Set()
      for (const workspace of workspaces.items || []) {
        for (const id of workspace.sessionIds || []) attached.add(id)
      }
      const archived = new Set(workspaces.archivedSessionIds || [])
      const hiddenBranches = window.__dshMessageTreeHiddenSessions
      const ids = []
      for (const id of sessions.ids || []) {
        if (attached.has(id) || archived.has(id)) continue
        if (hiddenBranches && hiddenBranches.has(id)) continue
        const summary = sessions.byId && sessions.byId[id]
        if (!summary || summary.origin === 'subagent') continue
        ids.push(id)
      }
      return ids
    }

    function isWorkspaceFreeSession(sessionId) {
      if (!sessionId) return false
      const workspaces = snapshotOf(pluginCtx && pluginCtx.workspaces)
      for (const workspace of workspaces.items || []) {
        if ((workspace.sessionIds || []).includes(sessionId)) return false
      }
      return true
    }

    async function fetchJson(path, options) {
      const response = await fetch(path, options)
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.ok === false) {
        const error = new Error(result.error || `Request failed (${response.status})`)
        error.code = result.code
        throw error
      }
      return result
    }

    async function createPureChatSession() {
      const result = await fetchJson(`${ROUTE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const sessionId = result.sessionId
      if (!sessionId) throw new Error('Host did not return a session id.')
      createdPureChatSessions.add(sessionId)
      const uiWorkspace = pluginCtx
        ? (typeof pluginCtx.get === 'function' ? pluginCtx.get('uiWorkspace') : pluginCtx.uiWorkspace)
        : undefined
      if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
        uiWorkspace.openSession(sessionId)
      } else if (pluginCtx && pluginCtx.sessions && typeof pluginCtx.sessions.open === 'function') {
        pluginCtx.sessions.open(sessionId)
      }
      return sessionId
    }

    async function loadPersona(sessionId) {
      try {
        const result = await fetchJson(`${ROUTE}/persona?sessionId=${encodeURIComponent(sessionId)}`)
        setStore({
          loaded: true,
          loading: false,
          persona: typeof result.persona === 'string' ? result.persona : '',
          defaultPersona: typeof result.defaultPersona === 'string' ? result.defaultPersona : DEFAULT_PERSONA,
          isDefault: Boolean(result.isDefault),
          error: '',
          status: '',
        })
      } catch (error) {
        const message = error && error.code === 'not-pure-chat'
          ? t('这个会话不是纯对话会话。', 'This is not a pure chat session.')
          : (error instanceof Error ? error.message : String(error))
        setStore({ loaded: false, loading: false, error: message })
      }
    }

    function openPersona(sessionId) {
      if (!sessionId) {
        setStore({
          open: true,
          sessionId: null,
          loaded: false,
          loading: false,
          saving: false,
          persona: '',
          error: t('请先打开一个纯对话会话。', 'Open a pure chat session first.'),
          status: '',
        })
        return
      }
      setStore({
        open: true,
        sessionId,
        loaded: false,
        loading: true,
        saving: false,
        persona: '',
        error: '',
        status: '',
      })
      loadPersona(sessionId)
    }

    const backdropStyle = {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5))',
    }

    const panelStyle = {
      width: 'min(620px, 100%)',
      maxHeight: '80vh',
      overflow: 'auto',
      padding: 16,
      borderRadius: 12,
      border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)',
      boxShadow: 'var(--dsw-elevation-panel)',
      fontSize: 13,
      lineHeight: '20px',
    }

    const headerStyle = {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    }

    const titleStyle = { fontSize: 14, fontWeight: 600, lineHeight: '22px' }
    const hintStyle = { marginTop: 4, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' }

    const textareaStyle = {
      width: '100%',
      minHeight: 220,
      boxSizing: 'border-box',
      resize: 'vertical',
      padding: 12,
      borderRadius: 10,
      border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-specific-input-major, var(--dsw-alias-bg-base))',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: 13,
      lineHeight: 1.6,
      outline: 'none',
    }

    const actionsStyle = {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 14,
    }

    const secondaryButtonStyle = {
      height: 32,
      padding: '0 12px',
      borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-alias-bg-layer-2)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: 13,
      lineHeight: '20px',
      cursor: 'pointer',
    }

    const primaryButtonStyle = {
      height: 32,
      padding: '0 12px',
      borderRadius: 8,
      border: 'none',
      background: 'var(--dsw-alias-button-primary-fill)',
      color: 'var(--dsw-alias-label-primary-foreground)',
      font: 'inherit',
      fontSize: 13,
      lineHeight: '20px',
      cursor: 'pointer',
    }

    const closeButtonStyle = {
      padding: 4,
      border: 'none',
      background: 'transparent',
      color: 'var(--dsw-alias-label-secondary)',
      fontSize: 20,
      lineHeight: 1,
      cursor: 'pointer',
    }

    const errorStyle = { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' }
    const statusStyle = { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-success-primary)' }

    function PersonaOverlay() {
      const state = useStore()
      const textareaRef = React.useRef(null)

      React.useEffect(() => {
        if (!state.open) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setStore({ open: false })
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [state.open])

      React.useEffect(() => {
        if (state.open && state.loaded && textareaRef.current) textareaRef.current.focus()
      }, [state.open, state.loaded])

      if (!state.open) return null

      const close = () => setStore({ open: false })
      const canEdit = Boolean(state.sessionId) && state.loaded && !state.loading && !state.saving
      const save = async () => {
        if (!canEdit) return
        setStore({ saving: true, error: '', status: '' })
        try {
          const result = await fetchJson(`${ROUTE}/persona`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.sessionId, text: state.persona }),
          })
          setStore({
            saving: false,
            persona: typeof result.persona === 'string' ? result.persona : state.persona,
            isDefault: Boolean(result.isDefault),
            status: t('已保存，下一轮生效。', 'Saved. Applies to the next turn.'),
          })
        } catch (error) {
          setStore({
            saving: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      const reset = () => {
        setStore({ persona: state.defaultPersona, status: '' })
      }

      return h('div', {
        style: backdropStyle,
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) close()
        },
      },
      h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('对话人格', 'Conversation persona'),
        style: panelStyle,
        onMouseDown: (event) => event.stopPropagation(),
      },
      h('div', { style: headerStyle },
        h('div', null,
          h('div', { style: titleStyle }, t('对话人格', 'Conversation persona')),
          h('div', { style: hintStyle }, t(
            '只对当前对话生效，不会修改 AGENTS.md。',
            'Applies to this conversation only; AGENTS.md is not modified.',
          ))),
        h('button', {
          type: 'button',
          onClick: close,
          'aria-label': t('关闭', 'Close'),
          style: closeButtonStyle,
        }, '×')),
      state.loading
        ? h('div', { style: hintStyle }, t('正在读取…', 'Loading…'))
        : !state.sessionId
          ? h('div', { style: hintStyle }, t('请先打开一个纯对话会话。', 'Open a pure chat session first.'))
          : !state.loaded
            ? h('div', null,
              h('div', { style: errorStyle }, state.error || t('读取人格失败。', 'Failed to load persona.')),
              h('div', { style: actionsStyle },
                h('button', { type: 'button', onClick: close, style: secondaryButtonStyle }, t('关闭', 'Close'))))
            : h('div', null,
              h('textarea', {
                ref: textareaRef,
                value: state.persona,
                onChange: (event) => setStore({ persona: event.target.value, status: '' }),
                disabled: state.saving,
                spellCheck: false,
                placeholder: t('写下这个对话的人格或系统提示…', 'Write this conversation’s persona or system prompt…'),
                style: textareaStyle,
              }),
              h('div', { style: hintStyle }, t(
                '保存后在下一轮请求生效；不会往对话里插入消息。',
                'Applies on the next request; no message is inserted into the conversation.',
              )),
              state.error ? h('div', { style: errorStyle }, state.error) : null,
              state.status ? h('div', { style: statusStyle }, state.status) : null,
              h('div', { style: actionsStyle },
                h('button', {
                  type: 'button',
                  onClick: reset,
                  disabled: state.saving,
                  style: secondaryButtonStyle,
                }, t('恢复默认', 'Reset to default')),
                h('button', {
                  type: 'button',
                  onClick: save,
                  disabled: !canEdit,
                  style: { ...primaryButtonStyle, opacity: canEdit ? 1 : 0.6 },
                }, state.saving ? t('保存中…', 'Saving…') : t('保存', 'Save'))))))
    }

    function wrapComposerEntry(entry) {
      if (!entry || entry[WRAPPED]) return () => {}
      const NativeComposer = entry.component
      function PureChatComposer(props) {
        React.useEffect(() => {
          if (!props.sessionId) return undefined
          setCurrentSessionId(props.sessionId)
          if (createdPureChatSessions.has(props.sessionId) || isWorkspaceFreeSession(props.sessionId)) {
            document.body.dataset.pureChat = 'true'
          } else {
            delete document.body.dataset.pureChat
          }
          return undefined
        }, [props.sessionId])
        const unlock = props.sessionId !== undefined && props.disabled === true && isWorkspaceFreeSession(props.sessionId)
        if (!unlock) return h(NativeComposer, props)
        return h(NativeComposer, {
          ...props,
          disabled: false,
          workspacePickerOpen: false,
          onRequestWorkspace: undefined,
          placeholder: t('开始一段对话…', 'Start a conversation…'),
        })
      }
      PureChatComposer.displayName = 'PureChatComposer(' + (NativeComposer.displayName || NativeComposer.name || 'Native') + ')'
      entry.component = PureChatComposer
      entry[WRAPPED] = { kind: 'composer', original: NativeComposer }
      return () => {
        if (entry.component === PureChatComposer) entry.component = NativeComposer
        delete entry[WRAPPED]
      }
    }

    function wrapHeroWorkspaceEntry(entry) {
      if (!entry || entry[WRAPPED]) return () => {}
      const NativeWorkspace = entry.component
      function PureChatHeroWorkspace(props) {
        const current = useCurrentSessionId() || sessionSnapshot().current
        const [, force] = React.useState(0)
        React.useEffect(() => {
          if (!current || createdPureChatSessions.has(current) || pureChatPresetCache.has(current)) return undefined
          let cancelled = false
          pureChatPresetCache.set(current, 'pending')
          fetchJson(`${ROUTE}/persona?sessionId=${encodeURIComponent(current)}`)
            .then(() => { pureChatPresetCache.set(current, true) })
            .catch(() => { pureChatPresetCache.set(current, false) })
            .finally(() => {
              if (!cancelled) force((value) => value + 1)
            })
          return () => {
            cancelled = true
          }
        }, [current])
        if (current && createdPureChatSessions.has(current)) return null
        const cached = current ? pureChatPresetCache.get(current) : undefined
        if (cached === true) return null
        if (cached === 'pending' && isWorkspaceFreeSession(current)) return null
        return h(NativeWorkspace, props)
      }
      PureChatHeroWorkspace.displayName = 'PureChatHeroWorkspace(' + (NativeWorkspace.displayName || NativeWorkspace.name || 'Native') + ')'
      entry.component = PureChatHeroWorkspace
      entry[WRAPPED] = { kind: 'hero-workspace', original: NativeWorkspace }
      return () => {
        if (entry.component === PureChatHeroWorkspace) entry.component = NativeWorkspace
        delete entry[WRAPPED]
      }
    }

    function patchNativeEntry(ctx, slotName, patch) {
      const restorers = new Map()
      function reconcile() {
        const entries = typeof ctx.slots.entries === 'function' ? (ctx.slots.entries(slotName) || []) : []
        for (const entry of entries) {
          if ((entry.options?.priority ?? 0) !== 0 || restorers.has(entry)) continue
          restorers.set(entry, patch(entry))
        }
      }
      reconcile()
      const unsubscribe = typeof ctx.slots.subscribe === 'function'
        ? ctx.slots.subscribe(slotName, reconcile)
        : undefined
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe()
        for (const restore of restorers.values()) restore()
        restorers.clear()
      }
    }

    function IconSearch({ size = 14 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1,
        'aria-hidden': true,
      },
      h('path', { d: 'M6.58727 11.8586C9.55061 11.8586 11.9529 9.45637 11.9529 6.49304C11.9529 3.5297 9.55061 1.12744 6.58727 1.12744C3.62394 1.12744 1.22168 3.5297 1.22168 6.49304C1.22168 9.45637 3.62394 11.8586 6.58727 11.8586Z' }),
      h('path', { d: 'M10.2991 10.3933L14.7783 14.8725' }))
    }

    function IconFilter({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M2.3 5h5.85M12.05 5h1.65' }),
      h('circle', { cx: 9.95, cy: 5, r: 1.45 }),
      h('path', { d: 'M2.3 11h1.65M7.85 11h5.85' }),
      h('circle', { cx: 5.75, cy: 11, r: 1.45 }))
    }

    function IconPlus({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M8 3V13M3 8H13' }))
    }

    function IconMore({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'currentColor',
        'aria-hidden': true,
      },
      h('circle', { cx: 4, cy: 8, r: 1.15 }),
      h('circle', { cx: 8, cy: 8, r: 1.15 }),
      h('circle', { cx: 12, cy: 8, r: 1.15 }))
    }

    function IconPersonaSmall({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round',
        'aria-hidden': true,
      },
      h('circle', { cx: 8, cy: 5.5, r: 2.3 }),
      h('path', { d: 'M3.5 13.5C3.5 10.9 5.5 9 8 9C10.5 9 12.5 10.9 12.5 13.5' }))
    }

    function IconRenameSmall({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '1.5 1.5 13 13', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1, strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M2.5 13.5L3.2 10.3L10.9 2.6C11.4 2.1 12.2 2.1 12.7 2.6L13.4 3.3C13.9 3.8 13.9 4.6 13.4 5.1L5.7 12.8L2.5 13.5Z' }),
      h('path', { d: 'M9.8 3.7L12.3 6.2' }))
    }

    function IconArchiveSmall({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '1.5 1.5 13 13', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1, strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M2.5 4.5H13.5' }),
      h('path', { d: 'M3.5 4.5V12.5C3.5 13.3 4.2 14 5 14H11C11.8 14 12.5 13.3 12.5 12.5V4.5' }),
      h('path', { d: 'M6.5 7.5H9.5' }))
    }

    function IconTrashSmall({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '1.5 1.5 13 13', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1, strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M2.5 4.5H13.5' }),
      h('path', { d: 'M6 4.5V3H10V4.5' }),
      h('path', { d: 'M4.5 4.5L5.1 13H10.9L11.5 4.5' }),
      h('path', { d: 'M6.6 6.8V11M9.4 6.8V11' }))
    }

    function SectionIconButton({ label, active, disabled, onClick, children }) {
      return h('button', {
        type: 'button',
        className: 'pc-icon-btn',
        title: label,
        'aria-label': label,
        'data-active': active ? 'true' : undefined,
        disabled,
        onClick,
      }, children)
    }

    function pureChatSummary(sessions, sessionId) {
      return (sessions && sessions.byId && sessions.byId[sessionId]) || {}
    }

    function pureChatTitle(sessions, sessionId) {
      const summary = pureChatSummary(sessions, sessionId)
      if (summary.title && summary.title !== sessionId) return summary.title
      if (summary.blank === true) return t('新对话', 'New chat')
      const title = summary.displayTitle || ''
      return title && title !== sessionId ? title : t('新对话', 'New chat')
    }

    function pureChatTimestamp(sessions, sessionId) {
      const treeSortAt = window.__dshMessageTreeSessionSortAt
      if (treeSortAt && typeof treeSortAt[sessionId] === 'number' && treeSortAt[sessionId] > 0) {
        return treeSortAt[sessionId]
      }
      const summary = pureChatSummary(sessions, sessionId)
      const raw = summary.updatedAt ?? summary.lastActivityAt ?? summary.createdAt
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw < 1e12 ? raw * 1000 : raw
      if (typeof raw === 'string') {
        const parsed = Date.parse(raw)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return 0
    }

    function relativeTime(timestamp) {
      if (!timestamp) return ''
      const delta = Math.max(0, Date.now() - timestamp)
      const minute = 60000
      const hour = 3600000
      const day = 86400000
      if (delta < minute) return t('刚刚', 'now')
      if (delta < hour) return t(`${Math.floor(delta / minute)}分钟`, `${Math.floor(delta / minute)}m`)
      if (delta < day) return t(`${Math.floor(delta / hour)}小时`, `${Math.floor(delta / hour)}h`)
      if (delta < day * 7) return t(`${Math.floor(delta / day)}天`, `${Math.floor(delta / day)}d`)
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }

    function usePureChatIds(sessions, workspaces) {
      const candidates = collectPureChatSessionIds(sessions, workspaces)
      const [, force] = React.useState(0)
      const key = candidates.join('|')
      React.useEffect(() => {
        let cancelled = false
        for (const sessionId of candidates) {
          if (createdPureChatSessions.has(sessionId)) continue
          if (pureChatPresetCache.has(sessionId)) continue
          pureChatPresetCache.set(sessionId, 'pending')
          fetchJson(`${ROUTE}/persona?sessionId=${encodeURIComponent(sessionId)}`)
            .then(() => { pureChatPresetCache.set(sessionId, true) })
            .catch(() => { pureChatPresetCache.set(sessionId, false) })
            .finally(() => {
              if (!cancelled) force((value) => value + 1)
            })
        }
        return () => { cancelled = true }
      }, [key])
      return candidates.filter((sessionId) => createdPureChatSessions.has(sessionId) || pureChatPresetCache.get(sessionId) === true)
    }

    function PopoverMenu({ x, y, children }) {
      return h('div', {
        className: 'pc-popover',
        style: { left: x, top: y },
        role: 'menu',
        onClick: (event) => event.stopPropagation(),
      }, children)
    }

    function PureChatSection({ sessions, workspaces }) {
      const [searchOpen, setSearchOpen] = React.useState(false)
      const [query, setQuery] = React.useState('')
      const [sort, setSort] = React.useState('recent')
      const [filterPos, setFilterPos] = React.useState(null)
      const [menu, setMenu] = React.useState(null)
      const [renaming, setRenaming] = React.useState(null)
      const [deleting, setDeleting] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const searchRef = React.useRef(null)
      const renamingRef = React.useRef(null)
      renamingRef.current = renaming
      const ids = usePureChatIds(sessions, workspaces)
      const activeId = sessions.current || currentSessionId

      const rows = ids.map((sessionId) => ({
        id: sessionId,
        title: pureChatTitle(sessions, sessionId),
        at: pureChatTimestamp(sessions, sessionId),
      })).filter((row) => {
        if (!query.trim()) return true
        return row.title.toLowerCase().includes(query.trim().toLowerCase())
      }).sort((a, b) => {
        if (sort === 'oldest') return a.at - b.at
        if (sort === 'name') return a.title.localeCompare(b.title, 'zh')
        return b.at - a.at
      })

      React.useEffect(() => {
        if (!searchOpen) return
        const timer = setTimeout(() => searchRef.current?.focus(), 20)
        return () => clearTimeout(timer)
      }, [searchOpen])

      React.useEffect(() => {
        if (!filterPos && !menu) return undefined
        const close = (event) => {
          if (event.target?.closest?.('.pc-popover')) return
          setFilterPos(null)
          setMenu(null)
        }
        const escape = (event) => {
          if (event.key === 'Escape') {
            setFilterPos(null)
            setMenu(null)
          }
        }
        document.addEventListener('pointerdown', close, true)
        document.addEventListener('keydown', escape)
        return () => {
          document.removeEventListener('pointerdown', close, true)
          document.removeEventListener('keydown', escape)
        }
      }, [filterPos, menu])

      const uiWorkspace = () => {
        try {
          return pluginCtx && typeof pluginCtx.get === 'function' ? pluginCtx.get('uiWorkspace') : pluginCtx?.uiWorkspace
        } catch {
          return undefined
        }
      }

      const openChat = (sessionId) => {
        const ui = uiWorkspace()
        if (ui && typeof ui.openSession === 'function') ui.openSession(sessionId)
      }

      const createChat = async () => {
        if (busy) return
        setBusy(true)
        try {
          await createPureChatSession()
          setSearchOpen(false)
          setQuery('')
        } catch (error) {
          console.error('pure-chat: create failed', error)
        } finally {
          setBusy(false)
        }
      }

      const archiveChat = async (sessionId) => {
        setMenu(null)
        const ui = uiWorkspace()
        if (!ui || typeof ui.archiveSession !== 'function') return
        try {
          await ui.archiveSession(sessionId, { stopActivity: true })
        } catch (error) {
          console.error('pure-chat: archive failed', error)
        }
      }

      const startRename = (row) => {
        setMenu(null)
        setRenaming({ id: row.id, value: row.title })
      }

      const finishRename = async (save) => {
        const current = renamingRef.current
        if (!current) return
        renamingRef.current = null
        setRenaming(null)
        if (!save) return
        const title = current.value.trim()
        if (!title || title === pureChatTitle(sessions, current.id)) return
        try {
          await fetchJson(`${ROUTE}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: current.id, title }),
          })
        } catch (error) {
          console.error('pure-chat: rename failed', error)
        }
      }

      const confirmDelete = async () => {
        const target = deleting
        setDeleting(null)
        if (!target) return
        try {
          await fetchJson(`${ROUTE}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: target.id }),
          })
        } catch (error) {
          console.error('pure-chat: delete failed', error)
        }
      }

      const openMenu = (event, row) => {
        event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        setMenu({ id: row.id, x: Math.max(8, rect.right - 168), y: rect.bottom + 4 })
      }

      const openFilter = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setFilterPos({ x: Math.max(8, rect.right - 150), y: rect.bottom + 4 })
      }

      const menuRow = menu ? rows.find((row) => row.id === menu.id) : null
      const sortLabels = {
        recent: t('最近更新', 'Recently updated'),
        oldest: t('最早更新', 'Oldest first'),
        name: t('按名称', 'By name'),
      }

      return h(Fragment, null,
        h('div', { className: 'pc-section', 'data-pure-chat-section': '', 'data-pure-chat': '' },
          h('div', { className: 'pc-section-header' },
            h('span', { className: 'pc-section-title' }, t('对话区', 'Conversations')),
            h('div', { className: 'pc-section-actions' },
              h(SectionIconButton, {
                label: t('搜索对话', 'Search conversations'),
                active: searchOpen,
                onClick: () => {
                  setSearchOpen((open) => {
                    if (open) setQuery('')
                    return !open
                  })
                },
              }, h(IconSearch, { size: 14 })),
              h(SectionIconButton, {
                label: t('筛选对话', 'Filter conversations'),
                active: Boolean(filterPos),
                onClick: openFilter,
              }, h(IconFilter)),
              h(SectionIconButton, {
                label: t('新建对话', 'New conversation'),
                disabled: busy,
                onClick: createChat,
              }, h(IconPlus)))),
          searchOpen ? h('div', { className: 'pc-search' },
            h('input', {
              ref: searchRef,
              value: query,
              onChange: (event) => setQuery(event.target.value),
              placeholder: t('搜索对话…', 'Search conversations…'),
              onKeyDown: (event) => {
                if (event.key === 'Escape') {
                  setSearchOpen(false)
                  setQuery('')
                }
              },
            })) : null,
          rows.length === 0
            ? (query ? h('div', { className: 'pc-empty' }, t('没有匹配的对话', 'No matching conversations')) : null)
            : rows.map((row) => h('div', {
              key: row.id,
              className: 'pc-row',
              'data-session-id': row.id,
              'data-active': row.id === activeId ? 'true' : undefined,
              role: 'button',
              tabIndex: 0,
              onClick: () => openChat(row.id),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openChat(row.id)
                }
              },
            },
            h('span', { className: 'pc-row-leading', 'aria-hidden': 'true' },
              pureChatSummary(sessions, row.id).running ? h('span', { className: 'pc-row-dot' }) : null),
            renaming && renaming.id === row.id
              ? h('input', {
                className: 'pc-rename',
                value: renaming.value,
                autoFocus: true,
                onClick: (event) => event.stopPropagation(),
                onChange: (event) => setRenaming({ id: row.id, value: event.target.value }),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    finishRename(true)
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    finishRename(false)
                  }
                },
                onBlur: () => finishRename(true),
                onFocus: (event) => event.currentTarget.select(),
              })
              : h('span', { className: 'pc-row-title' }, row.title),
            h('span', { className: 'pc-row-time' }, relativeTime(row.at)),
            h('button', {
              type: 'button',
              className: 'pc-more',
              title: t('更多操作', 'More actions'),
              'aria-label': t('更多操作', 'More actions'),
              onClick: (event) => openMenu(event, row),
            }, h(IconMore, { size: 14 })))),
        ),
        menu && menuRow ? h(PopoverMenu, { x: menu.x, y: menu.y },
        h('button', {
          type: 'button', className: 'pc-popover-item', role: 'menuitem',
          onClick: () => {
            setMenu(null)
            openPersona(menuRow.id)
          },
        }, h(IconPersonaSmall, { size: 14 }), h('span', null, t('编辑人格', 'Edit persona'))),
        h('button', {
          type: 'button', className: 'pc-popover-item', role: 'menuitem',
          onClick: () => startRename(menuRow),
        }, h(IconRenameSmall, { size: 14 }), h('span', null, t('重命名', 'Rename'))),
        h('button', {
          type: 'button', className: 'pc-popover-item', role: 'menuitem',
          onClick: () => { archiveChat(menuRow.id) },
        }, h(IconArchiveSmall, { size: 14 }), h('span', null, t('归档', 'Archive'))),
        h('button', {
          type: 'button', className: 'pc-popover-item', role: 'menuitem', 'data-danger': 'true',
          onClick: () => {
            setMenu(null)
            setDeleting({ id: menuRow.id, title: menuRow.title })
          },
        }, h(IconTrashSmall, { size: 14 }), h('span', null, t('删除对话', 'Delete conversation'))))
          : null,
        filterPos ? h(PopoverMenu, { x: filterPos.x, y: filterPos.y },
        ['recent', 'oldest', 'name'].map((value) => h('button', {
          key: value,
          type: 'button',
          className: 'pc-popover-item',
          role: 'menuitemradio',
          'aria-checked': sort === value ? 'true' : 'false',
          onClick: () => {
            setSort(value)
            setFilterPos(null)
          },
        }, h('span', { className: 'pc-popover-check' }, sort === value ? '✓' : ''), h('span', null, sortLabels[value]))))
          : null,
        deleting ? h('div', {
          className: 'pc-modal-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) setDeleting(null)
          },
        },
        h('div', { className: 'pc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('删除对话', 'Delete conversation') },
          h('div', { className: 'pc-modal-title' },
            h('span', { style: { color: 'var(--dsw-alias-state-error-primary)', display: 'inline-flex' } }, h(IconTrashSmall, { size: 16 })),
            h('span', null, t('删除对话', 'Delete conversation'))),
          h('div', { className: 'pc-modal-body' }, t('删除后将从侧边栏移除；仍在运行的对话会先停止。', 'The conversation will be removed from the sidebar; a running turn will be stopped first.')),
          h('div', { className: 'pc-modal-actions' },
            h('button', { type: 'button', className: 'pc-btn', onClick: () => setDeleting(null) }, t('取消', 'Cancel')),
            h('button', { type: 'button', className: 'pc-btn', 'data-danger': 'true', onClick: confirmDelete }, t('删除', 'Delete')))))
          : null)
    }

    function wrapSidebarEntry(entry) {
      if (!entry || entry[WRAPPED]) return () => {}
      const NativeSidebar = entry.component
      function PureChatSidebar(props) {
        const sessions = props.useSessions((snapshot) => snapshot)
        const workspaces = props.useWorkspaces((snapshot) => snapshot)
        return h(Fragment, null,
          h('style', null, SIDEBAR_CSS),
          h(PureChatSection, { sessions, workspaces }),
          h(NativeSidebar, props))
      }
      PureChatSidebar.displayName = 'PureChatSidebar(' + (NativeSidebar.displayName || NativeSidebar.name || 'Native') + ')'
      entry.component = PureChatSidebar
      entry[WRAPPED] = { kind: 'sidebar', original: NativeSidebar }
      return () => {
        if (entry.component === PureChatSidebar) entry.component = NativeSidebar
        delete entry[WRAPPED]
      }
    }

    function apply(ctx) {
      pluginCtx = ctx
      ctx.slots.inject('sidebar.workspaces', () => patchNativeEntry(ctx, 'sidebar.workspaces', wrapSidebarEntry))
      ctx.slots.inject('conversation.composer.bar', () => patchNativeEntry(ctx, 'conversation.composer.bar', wrapComposerEntry))
      ctx.slots.inject('conversation.hero.workspace', () => patchNativeEntry(ctx, 'conversation.hero.workspace', wrapHeroWorkspaceEntry))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'pure-chat.persona-overlay',
        order: 10,
      }, PersonaOverlay))
      return () => {
        pluginCtx = null
      }
    }

    return {
      inject: ['slots', 'sessions', 'workspaces'],
      apply,
    }
  },
})
