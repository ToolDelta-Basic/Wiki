<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vitepress'

type TerminalLine = {
  id: number
  text: string
  segments?: TerminalSegment[]
  isTyped?: boolean
  kind?: 'prompt' | 'error' | 'success' | 'muted' | 'ascii' | 'logo' | 'menu' | 'warning' | 'link'
}

type TerminalSegment = {
  text: string
  color?: string
  backgroundColor?: string
  fontWeight?: string | number
  fontStyle?: string
  textDecoration?: string
  borderRadius?: string
  padding?: string
}

type ScriptLine = Omit<TerminalLine, 'id'>

type MarketPluginRaw = {
  name?: string
  author?: string
  version?: string | number[]
  description?: string
  'plugin-type'?: string
  'pre-plugins'?: Record<string, string>
  'plugin-id'?: string
}

type MarketPackageRaw = {
  author?: string
  version?: string
  description?: string
  'plugin-ids'?: string[]
}

type MarketTree = {
  SourceName?: string
  Greetings?: string
  Packages?: Record<string, MarketPackageRaw>
  MarketPlugins?: Record<string, MarketPluginRaw>
}

interface MarketFileTree {
  [key: string]: number | MarketFileTree
}

type MarketEntry = {
  key: string
  originalKey: string
  type: 'plugin' | 'package'
  data: MarketPluginRaw | MarketPackageRaw
}

type MarketCache = {
  baseUrl: string
  marketData: MarketTree
  pluginIdsMap: Record<string, string>
  showList: MarketEntry[]
  directoryTree?: MarketFileTree
}

type MarketMode =
  | 'searchMenu'
  | 'awaitKeyword'
  | 'resultList'
  | 'pluginDetail'
  | 'packageDetail'

type MarketSearchType = 'name' | 'author' | 'id'

const terminalBody = ref<HTMLElement | null>(null)
const terminalInput = ref<HTMLInputElement | null>(null)
const commandInput = ref('')
const terminalLines = ref<TerminalLine[]>([])
const isTyping = ref(false)
const isInputReady = ref(false)
const reduceMotion = ref(false)
const isTerminalFocused = ref(false)
const isToolDeltaMenuActive = ref(false)
const isToolDeltaRunning = ref(false)
const isPluginMarketActive = ref(false)
const isFastBuilderStarted = ref(false)
const route = useRoute()
const shellPrompt = 'root@tooldelta:~#'
const promptText = computed(() =>
  isToolDeltaMenuActive.value || isToolDeltaRunning.value || isPluginMarketActive.value
    ? '>'
    : shellPrompt
)
const visibleCommand = computed(() => commandInput.value || '\u00a0')
const currentRoutePath = computed(() => decodeURIComponent(route.path || '/unknown/path'))

let lineId = 0
let disposed = false
let marketCache: MarketCache | null = null
let marketMode: MarketMode = 'searchMenu'
let marketSearchType: MarketSearchType | null = null
let marketResults: MarketEntry[] = []
let marketPageStart = 0
let marketLastOperation = ''
let selectedMarketEntry: MarketEntry | null = null

const TYPE_DELAY_SCALE = 0.45
const MARKET_PAGE_SIZE = 15
const PRIMARY_MARKET_BASE_URL = 'https://pm.tooldelta.top'
const GITHUB_RAW_MARKET_BASE_URL = 'https://raw.githubusercontent.com/ToolDelta-Basic/PluginMarket/refs/heads/main'
const REMOTE_PLUGIN_DATA_DIR = '插件数据文件'
const REMOTE_PLUGIN_CONFIG_DIR = '插件配置文件'

const getInitialLines = (): ScriptLine[] => [
  { text: `${shellPrompt} cd ${currentRoutePath.value}`, kind: 'prompt' },
  { text: `-bash: cd: ${currentRoutePath.value}: No such file or directory`, kind: 'error' },
]

const toolDeltaVersion = '1.3.5'

const mcColorMap: Record<string, string> = {
  '0': '#555555',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  a: '#55ff55',
  b: '#55ffff',
  c: '#ff5555',
  d: '#ff55ff',
  e: '#ffff55',
  f: '#ffffff',
  g: '#ddd605',
  h: '#e3d4d1',
  i: '#cecaca',
  j: '#443a3b',
  m: '#971607',
  n: '#b4684d',
  o: '#deb12d',
  p: '#deb12d',
  q: '#47a036',
  r: '#9a5cc6',
  s: '#2cbaa8',
  t: '#21497b',
  u: '#9a5cc6',
  v: '#eb7114',
}

const toolDeltaLogoWithColors = `╔═════════════════════════════════════════════════════════════════════════╗
║§9████████╗ ██████╗  ██████╗ ██╗     §b██████╗ ███████╗██╗  ████████╗ █████╗ §r║
║§9╚══██╔══╝██╔═══██╗██╔═══██╗██║     §b██╔══██╗██╔════╝██║  ╚══██╔══╝██╔══██╗§r║
║§9   ██║   ██║   ██║██║   ██║██║     §b██║  ██║█████╗  ██║     ██║   ███████║§r║
║§9   ██║   ██║   ██║██║   ██║██║     §b██║  ██║██╔══╝  ██║     ██║   ██╔══██║§r║
║§9   ██║   ╚██████╔╝╚██████╔╝███████╗§b██████╔╝███████╗███████╗██║   ██║  ██║§r║
║§9   ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝§b╚═════╝ ╚══════╝╚══════╝╚═╝   ╚═╝  ╚═╝§r║
╚═════════════════════════════════════════════════════════════════════════╝§r`

const toolDeltaLogoWithoutColors = `╔═════════════════════════════════════════════════════════════════════════╗
║████████╗ ██████╗  ██████╗ ██╗     ██████╗ ███████╗██╗  ████████╗ █████╗ ║
║╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔══██╗██╔════╝██║  ╚══██╔══╝██╔══██╗║
║   ██║   ██║   ██║██║   ██║██║     ██║  ██║█████╗  ██║     ██║   ███████║║
║   ██║   ██║   ██║██║   ██║██║     ██║  ██║██╔══╝  ██║     ██║   ██╔══██║║
║   ██║   ╚██████╔╝╚██████╔╝███████╗██████╔╝███████╗███████╗██║   ██║  ██║║
║   ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚═════╝ ╚══════╝╚══════╝╚═╝   ╚═╝  ╚═╝║
╚═════════════════════════════════════════════════════════════════════════╝`

const toolDeltaLogoModes = [
  { type: 'mc' as const, text: toolDeltaLogoWithColors },
  { type: 'gradient' as const, text: toolDeltaLogoWithoutColors, from: [0, 100, 255], to: [138, 43, 226] },
  { type: 'gradient' as const, text: toolDeltaLogoWithoutColors, from: [34, 139, 34], to: [144, 238, 144] },
  { type: 'gradient' as const, text: toolDeltaLogoWithoutColors, from: [255, 165, 0], to: [128, 0, 128] },
  { type: 'gradient' as const, text: toolDeltaLogoWithoutColors, from: [255, 182, 193], to: [221, 160, 221] },
]

const toolDeltaMenuTexts = [
  '§a请选择启动模式§6(使用启动参数 -l <启动模式> 可以跳过该页面):',
  '1 - §b启动 ToolDelta',
  '2 - §d打开插件管理器',
  '3 - §d打开插件市场',
  '4 - §6初始化所有插件配置',
  '5 - §a修改启动配置',
  '6 - §c开启直接启动模式',
  'q - §7退出',
]

const welcomeTexts = [
  '§fToolDelta Panel Embed By SuperScript',
  '§fToolDelta Wiki: §bhttps://wiki.tooldelta.top/',
  '§fToolDelta 交流群: §b1030755163',
  '§fToolDelta 项目地址: §bhttps://github.com/ToolDelta-Basic',
  `§fToolDelta v ${toolDeltaVersion}`,
  '§aToolDelta Panel 已启动',
]

const fastBuilderLines: ScriptLine[] = [
  { text: '[1] 简体中文', kind: 'menu' },
  { text: '[2] 繁體中文', kind: 'menu' },
  { text: '[3] 正體中文', kind: 'menu' },
  { text: '[4] 日本語', kind: 'menu' },
  { text: '[5] American English', kind: 'menu' },
  { text: '[6] British English', kind: 'menu' },
  { text: '(ID): 1', kind: 'muted' },
  { text: '', kind: 'muted' },
  { text: 'https://github.com/LNSSPsd/PhoenixBuilder', kind: 'link' },
  { text: '', kind: 'muted' },
  { text: 'PhoenixBuilder 9.9.9 (hppfnur)', kind: 'warning' },
  { text: '已启用语言： 简体中文', kind: 'muted' },
]

const startupLogEntries = [
  ['load', 'ToolDelta Panel Embed By SuperScript'],
  ['load', 'ToolDelta Panel Running on Python 3.10'],
  ['load', 'ToolDelta Wiki: §nhttps://wiki.tooldelta.top/'],
  ['load', 'ToolDelta 交流群: 1030755163'],
  ['load', 'ToolDelta 项目地址: §nhttps://github.com/ToolDelta-Basic'],
  ['load', `ToolDelta v ${toolDeltaVersion}`],
  ['load', 'ToolDelta Panel 已启动'],
  ['info', '是否使用自定义验证服务器 (如果您不了解, 请直接按回车跳过)'],
  ['info', '输入y确认使用, 其他则使用内置验证: n'],
  ['success', '已使用内置默认验证'],
  ['info', '请输入租赁服号：114514'],
  ['info', '请输入租赁服密码 (不会回显，没有请直接回车): '],
  ['success', '登录配置设置成功'],
  ['success', '配置文件读取完成'],
  ['info', '§a正在使用 §bHiQuality §dDX §a模式读取插件'],
  ['success', '所有插件读取完毕, 将进行插件初始化'],
  ['success', '插件初始化成功, 载入 §r§l0 §r§a个类式插件'],
  ['success', '已开始执行 ToolDelta定时任务 函数集.'],
  ['success', '将使用空闲端口 §r§l24013 §r§a与接入点进行网络通信'],
  ['info', '§a等待接入点就绪..'],
  ['neomega', '[neOmega 接入点]: 启动中...'],
  ['neomega', '开始执行登陆序列'],
  ['neomega', '正在检查并更新本地neOmega网络中的属性信息'],
  ['neomega', '正在连接到地堡'],
  ['neomega', '成功与地堡建立连接'],
  ['neomega', '正在连接到网易租赁服(服号: 114514 密码: No)...'],
  ['neomega', '正在生成客户端密钥对'],
  ['neomega', '正在从地堡取得机器人数据'],
  ['neomega', '来自地堡的消息:'],
  ['neomega', '    §a广告位招租！'],
  ['neomega', '正在建立 raknet 连接'],
  ['neomega', '正在封装数据帧连接层'],
  ['neomega', '正在封装数据包连接层'],
  ['neomega', '正在生成关键登陆数据'],
  ['neomega', '正在向 Minecraft 服务器请求网络参数'],
  ['neomega', '正在向 Minecraft 服务器请求游戏登录'],
  ['neomega', '正在向 Minecraft 服务器确认握手请求'],
  ['neomega', '登录序列第一阶段完成'],
  ['neomega', '正在发送附加信息'],
  ['neomega', '正在打包关键数据'],
  ['neomega', '成功连接到网易租赁服'],
  ['neomega', '正在检测租赁服内 sendcommandfeedback 模式'],
  ['neomega', '正在尝试完成网易要求的零知识机器人身份证明...'],
  ['neomega', '根据启动时信息, omega 将沿用设置: gamerule sendcommandfeedback=true'],
  ['neomega', '成功完成网易要求的零知识机器人身份证明'],
  ['neomega', '等待机器人生成'],
  ['neomega', '登录序列完成'],
  ['neomega', '正在检查机器人的权限和租赁服内作弊模式是否打开...'],
  ['neomega', '机器人已获得操作员权限'],
  ['success', '接入点已就绪'],
  ['neomega', '机器人的权限和租赁服内作弊模式检查完成，无问题'],
  ['neomega', '执行后挑战任务: request tick update schedule'],
  ['neomega', '执行后挑战任务: auto respawn'],
  ['neomega', '执行后挑战任务: force reset dimension and pos'],
  ['neomega', '执行后挑战任务: make bot creative'],
  ['neomega', '正在将机器人切换为创造模式'],
  ['neomega', '成功将机器人设置为创造模式'],
  ['clean', '执行后挑战任务: check bot command status each 10s'],
  ['success', '接入点框架通信网络连接成功'],
  ['success', '已从接入点获取全局玩家数据'],
  ['success', '成功连接到游戏网络并初始化, 在线玩家: 工具不增量, 机器人 ID: 工具不增量'],
  ['info', '在控制台输入 §b插件市场 §r以§a一键获取§rToolDelta官方和第三方的插件'],
  ['success', '在控制台输入 §r§lhelp / ? §r可查看控制台命令'],
  ['success', 'ToolHack Terminal 进程已注入, 允许开启标准输入'],
  ['neomega', '[neOmega 接入点]: 就绪'],
] as const

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const sameSegmentStyle = (a: TerminalSegment, b: Omit<TerminalSegment, 'text'>) =>
  a.color === b.color &&
  a.backgroundColor === b.backgroundColor &&
  a.fontWeight === b.fontWeight &&
  a.fontStyle === b.fontStyle &&
  a.textDecoration === b.textDecoration &&
  a.borderRadius === b.borderRadius &&
  a.padding === b.padding

const appendStyledText = (
  segments: TerminalSegment[],
  text: string,
  style: Omit<TerminalSegment, 'text'> = {},
) => {
  if (!text) return

  const last = segments[segments.length - 1]
  if (last && sameSegmentStyle(last, style)) {
    last.text += text
    return
  }

  segments.push({ text, ...style })
}

const appendStyledTextImmutable = (
  segments: TerminalSegment[],
  text: string,
  style: Omit<TerminalSegment, 'text'> = {},
) => {
  if (!text) return segments

  const next = segments.slice()
  const last = next[next.length - 1]

  if (last && sameSegmentStyle(last, style)) {
    next[next.length - 1] = { ...last, text: last.text + text }
    return next
  }

  next.push({ text, ...style })
  return next
}

const parseMcSegments = (text: string): TerminalSegment[] => {
  const segments: TerminalSegment[] = []
  let style: Omit<TerminalSegment, 'text'> = {}

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '§' && next) {
      const code = next.toLowerCase()

      if (code === 'l') {
        style = { ...style, fontWeight: 800 }
        i += 1
        continue
      }

      if (code === 'r') {
        style = {}
        i += 1
        continue
      }

      if (code === 'u') {
        style = { ...style, textDecoration: 'underline' }
        i += 1
        continue
      }

      if (code === 'n') {
        style = { ...style, textDecoration: 'underline' }
        i += 1
        continue
      }

      if (mcColorMap[code]) {
        style = {
          color: mcColorMap[code],
          fontWeight: style.fontWeight,
          textDecoration: style.textDecoration,
        }
        i += 1
        continue
      }
    }

    appendStyledText(segments, char, style)
  }

  return segments
}

const lineFromSegments = (
  segments: TerminalSegment[],
  kind: ScriptLine['kind'] = 'menu',
): ScriptLine => ({
  text: segments.map((segment) => segment.text).join(''),
  segments,
  kind,
})

const mcLine = (text: string, kind: ScriptLine['kind'] = 'menu') =>
  lineFromSegments(parseMcSegments(text), kind)

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '')
const encodeMarketPath = (path: string) => String(path).split('/').map(encodeURIComponent).join('/')
const getMarketFileUrl = (baseUrl: string, path: string) => `${normalizeBaseUrl(baseUrl)}/${encodeMarketPath(path)}`
const marketUrlJoin = (...parts: string[]) => parts.map((part) => String(part).replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')

const getLogTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `[${hours}:${minutes}]`
}

const consoleUnknownCommandLine = (command: string): ScriptLine =>
  tdLogLine('warning', `命令 ${command.split(/\s+/)[0]} 不存在, 输入 ? 查看帮助`)

const logLabelStyleMap = {
  load: { label: ' 加载 ', color: '#000000', backgroundColor: '#ff55ff' },
  info: { label: ' 信息 ', color: '#000000', backgroundColor: '#ffffff' },
  warning: { label: ' 警告 ', color: '#000000', backgroundColor: '#ffff55' },
  success: { label: ' 成功 ', color: '#000000', backgroundColor: '#55ff55' },
  neomega: { label: ' NOMG ', color: '#000000', backgroundColor: '#55ffff' },
}

const tdLogLine = (
  level: 'load' | 'info' | 'warning' | 'success' | 'neomega' | 'clean',
  text: string,
): ScriptLine => {
  if (level === 'clean') return mcLine(text, 'menu')

  const labelStyle = logLabelStyleMap[level]
  const segments = parseMcSegments(text)
  const hasExplicitTextColor = segments.some((segment) => segment.color)

  return lineFromSegments([
    { text: `${getLogTime()} `, color: '#ffffff' },
    {
      text: labelStyle.label,
      color: labelStyle.color,
      backgroundColor: labelStyle.backgroundColor,
      borderRadius: '2px',
      padding: '0 2px',
    },
    { text: ' ' },
    ...segments.map((segment) => ({
      ...segment,
      color: segment.color || (hasExplicitTextColor
        ? undefined
        : level === 'success'
          ? mcColorMap.a
          : level === 'load'
            ? mcColorMap.d
            : level === 'warning'
              ? mcColorMap[6]
              : undefined),
    })),
  ], level === 'success' ? 'success' : 'menu')
}

const createToolDeltaStartupLines = () =>
  startupLogEntries.map(([level, text]) => tdLogLine(level, text))

const fetchJson = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${url}`)
  }
  return response.json()
}

const resolveMarketBaseUrl = async () => {
  try {
    const response = await fetch(`${PRIMARY_MARKET_BASE_URL}/`, { cache: 'no-store' })
    if (response.status === 403) throw new Error('HTTP 403')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return PRIMARY_MARKET_BASE_URL
  } catch {
    return GITHUB_RAW_MARKET_BASE_URL
  }
}

const createMarketShowList = (marketData: MarketTree): MarketEntry[] => {
  const packages = Object.entries(marketData.Packages ?? {}).map(([name, data]) => ({
    key: name.startsWith('[pkg]') ? name : `[pkg]${name}`,
    originalKey: name,
    type: 'package' as const,
    data,
  }))

  const plugins = Object.entries(marketData.MarketPlugins ?? {}).map(([pluginId, data]) => ({
    key: pluginId,
    originalKey: pluginId,
    type: 'plugin' as const,
    data,
  }))

  return [...packages, ...plugins]
}

const loadMarketCache = async (): Promise<MarketCache> => {
  if (marketCache) return marketCache

  const marketBaseUrl = await resolveMarketBaseUrl()
  let data: MarketTree
  let pluginIdsMap: Record<string, string>

  try {
    data = await fetchJson(getMarketFileUrl(marketBaseUrl, 'market_tree.json')) as MarketTree
    pluginIdsMap = await fetchJson(getMarketFileUrl(marketBaseUrl, 'plugin_ids_map.json')) as Record<string, string>
  } catch (error) {
    if (marketBaseUrl === GITHUB_RAW_MARKET_BASE_URL) throw error
    data = await fetchJson(getMarketFileUrl(GITHUB_RAW_MARKET_BASE_URL, 'market_tree.json')) as MarketTree
    pluginIdsMap = await fetchJson(getMarketFileUrl(GITHUB_RAW_MARKET_BASE_URL, 'plugin_ids_map.json')) as Record<string, string>
    marketCache = {
      baseUrl: GITHUB_RAW_MARKET_BASE_URL,
      marketData: data,
      pluginIdsMap,
      showList: createMarketShowList(data),
    }
    return marketCache
  }

  marketCache = {
    baseUrl: marketBaseUrl,
    marketData: data,
    pluginIdsMap,
    showList: createMarketShowList(data),
  }

  return marketCache
}

const rgbText = (rgb: number[]) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`

const interpolateRgb = (from: number[], to: number[], ratio: number) =>
  from.map((value, index) => Math.round(value + (to[index] - value) * ratio))

const createGradientLogoLines = (text: string, from: number[], to: number[]) => {
  const lines: TerminalSegment[][] = [[]]
  const maxIndex = Math.max(text.length - 1, 1)

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (char === '\n') {
      lines.push([])
      continue
    }

    const color = rgbText(interpolateRgb(from, to, index / maxIndex))
    appendStyledText(lines[lines.length - 1], char, { color, fontWeight: 800 })
  }

  return lines.map((segments) => lineFromSegments(segments, 'logo'))
}

const createToolDeltaLogoLines = () => {
  const mode = toolDeltaLogoModes[Math.floor(Math.random() * toolDeltaLogoModes.length)]

  if (mode.type === 'mc') {
    return mode.text.split('\n').map((line) => mcLine(line, 'logo'))
  }

  return createGradientLogoLines(mode.text, mode.from, mode.to)
}

const createToolDeltaMenuLines = (): ScriptLine[] => [
  ...createToolDeltaLogoLines(),
  ...toolDeltaMenuTexts.map((text) => mcLine(text, 'menu')),
]

const createToolDeltaMenuOnlyLines = (): ScriptLine[] =>
  toolDeltaMenuTexts.map((text) => mcLine(text, 'menu'))

const createWelcomeLines = () => welcomeTexts.map((text) => mcLine(text, 'menu'))

const createToolDeltaConsoleHelpLines = (): ScriptLine[] => [
  tdLogLine('info', '§a以下是可选的菜单指令项: '),
  tdLogLine('info', ' §e? 或 help 或 帮助 或 ？  §f->  查询可用菜单指令'),
  tdLogLine('info', ' §eexit  §f->  退出并返回启动菜单'),
  tdLogLine('info', ' §e插件市场  §f->  进入插件市场'),
]

const getMarketHeaderText = (cache = marketCache) => {
  const sourceName = cache?.marketData.SourceName || 'ToolDelta PluginMarket'
  const greetings = cache?.marketData.Greetings || '欢迎来到 ToolDelta 插件市场'
  return `${sourceName}: ${greetings}`
}

const createMarketSearchMenuLines = (cache = marketCache): ScriptLine[] => [
  mcLine(getMarketHeaderText(cache), 'menu'),
  mcLine('§a------------------------------', 'menu'),
  mcLine('§6请选择搜索方式: ', 'warning'),
  mcLine('  1 -     §b按插件名', 'menu'),
  mcLine('  2 -     §d按插件作者名', 'menu'),
  mcLine('  3 -     §e按插件 ID', 'menu'),
  mcLine('  4 -     §a随便逛逛', 'menu'),
  mcLine('  其它    §c退出', 'menu'),
  mcLine('请输入选项:', 'menu'),
]

const getPluginName = (entry: MarketEntry, cache = marketCache) => {
  if (entry.type === 'package') return entry.key.replace(/^\[pkg\]/, '')
  const pluginData = entry.data as MarketPluginRaw
  return cache?.pluginIdsMap[entry.key] || pluginData.name || entry.key
}

const getPluginTypeName = (pluginType?: string) =>
  ({ classic: '类式' } as Record<string, string>)[pluginType || 'unknown'] || pluginType || 'unknown'

const getPluginTypeDetailName = (pluginType?: string) =>
  ({ classic: '主类式', unknown: '未知类型' } as Record<string, string>)[pluginType || 'unknown'] || '未知类型'

const stringifyVersion = (version?: string | number[]) => {
  if (Array.isArray(version)) return version.join('.')
  return version || '0.0.0'
}

const countFilesInTree = (tree: number | MarketFileTree | undefined): number => {
  if (!tree || typeof tree === 'number') return 0
  return Object.values(tree).reduce<number>(
    (sum, value) => sum + (typeof value === 'number' ? 1 : countFilesInTree(value)),
    0,
  )
}

const getMarketSubTree = (tree: MarketFileTree | undefined, path: string) => {
  if (!tree) return undefined
  let current: number | MarketFileTree | undefined = tree

  for (const part of path.split('/').filter(Boolean)) {
    if (!current || typeof current === 'number') return undefined
    current = current[part]
  }

  return current
}

const loadMarketDirectoryTree = async () => {
  const cache = await loadMarketCache()
  if (cache.directoryTree) return cache.directoryTree

  cache.directoryTree = await fetchJson(getMarketFileUrl(cache.baseUrl, 'directory_tree.json')) as MarketFileTree
  return cache.directoryTree
}

const createMarketResultLines = (): ScriptLine[] => {
  const totalIndexes = marketResults.length
  const totalPages = Math.max(1, Math.floor((totalIndexes - 1) / MARKET_PAGE_SIZE) + 1)
  const page = Math.floor(marketPageStart / MARKET_PAGE_SIZE) + 1
  const lines: ScriptLine[] = [mcLine(getMarketHeaderText(), 'menu')]

  for (let i = marketPageStart; i < Math.min(marketPageStart + MARKET_PAGE_SIZE, totalIndexes); i += 1) {
    const entry = marketResults[i]
    if (entry.type === 'package') {
      lines.push(mcLine(` ${i + 1}. §c[整合包]§e${entry.key.replace(/^\[pkg\]/, '')}`, 'menu'))
      continue
    }

    const pluginData = entry.data as MarketPluginRaw
    lines.push(mcLine(
      ` ${i + 1}. §e${getPluginName(entry)} §av${stringifyVersion(pluginData.version)} §b@${pluginData.author || 'unknown'} §d${getPluginTypeName(pluginData['plugin-type'])}插件`,
      'menu',
    ))
  }

  lines.push(mcLine(`§f第§a${page}§f/§a${totalPages}§f页, 输入§b+§f/§b-§f翻页`, 'menu'))
  lines.push(mcLine('§f输入插件序号选中插件并查看其下载页', 'menu'))
  lines.push(mcLine('§f回车键继续上次操作, §bq§f 退出，请输入:', 'menu'))
  return lines
}

const createPluginDetailLines = (entry: MarketEntry, hasDoc: boolean): ScriptLine[] => {
  const pluginData = entry.data as MarketPluginRaw
  const prePlugins = pluginData['pre-plugins'] ?? {}
  const prePluginsText = Object.keys(prePlugins).length
    ? Object.entries(prePlugins).map(([name, version]) => `${name}§7v${version}`).join(', ')
    : '无'

  return [
    mcLine(`${getPluginName(entry)} v${stringifyVersion(pluginData.version)}`, 'menu'),
    mcLine(`作者: §f${pluginData.author || 'unknown'}§7, 版本: §f${stringifyVersion(pluginData.version)} §b${getPluginTypeDetailName(pluginData['plugin-type'])}`, 'menu'),
    mcLine(`前置插件：§f${prePluginsText}`, 'menu'),
    mcLine(`介绍：${pluginData.description || ''}`, 'menu'),
    { text: '', kind: 'menu' },
    mcLine(`§f下载 = §aY§f, 取消 = §cN§f${hasDoc ? ', 查看文档 = §dD§f ' : ''} 请输入:`, 'menu'),
  ]
}

const createPackageDetailLines = async (entry: MarketEntry): Promise<ScriptLine[]> => {
  const cache = await loadMarketCache()
  const packageData = entry.data as MarketPackageRaw
  const packageKey = entry.key.startsWith('[pkg]') ? entry.key : `[pkg]${entry.key}`
  const packageName = packageKey.replace(/^\[pkg\]/, '')
  let configFileCount = 0
  let dataFileCount = 0

  try {
    const directoryTree = await loadMarketDirectoryTree()
    configFileCount = countFilesInTree(getMarketSubTree(directoryTree, marketUrlJoin(packageKey, REMOTE_PLUGIN_CONFIG_DIR)))
    dataFileCount = countFilesInTree(getMarketSubTree(directoryTree, marketUrlJoin(packageKey, REMOTE_PLUGIN_DATA_DIR)))
  } catch {
    configFileCount = 0
    dataFileCount = 0
  }

  const includedPluginNames = (packageData['plugin-ids'] ?? []).map((pluginId) =>
    cache.pluginIdsMap[pluginId] || cache.marketData.MarketPlugins?.[pluginId]?.name || pluginId
  )

  return [
    mcLine(`§f整合包 §b${packageName} §7(v${packageData.version || '?'})§r:`, 'menu'),
    mcLine(`作者: §b${packageData.author || 'unknown'}`, 'menu'),
    mcLine(`介绍: §f${(packageData.description || '').replace(/\n/g, '\n      ')}`, 'menu'),
    mcLine('§d包含的插件的列表:', 'menu'),
    ...includedPluginNames.map((pluginName) => mcLine(` §7- §r${pluginName}`, 'menu')),
    mcLine(`§2并包含§r${configFileCount}§2个插件配置文件, §r${dataFileCount}§2个插件数据文件`, 'menu'),
    mcLine('§f下载安装 = §aY§f, 取消 = §cN§f, 请输入：', 'menu'),
  ]
}

const hasPluginDoc = async (entry: MarketEntry) => {
  try {
    const directoryTree = await loadMarketDirectoryTree()
    const pluginTree = getMarketSubTree(directoryTree, getPluginName(entry))
    return Boolean(pluginTree && typeof pluginTree !== 'number' && (pluginTree['readme.txt'] !== undefined || pluginTree['readme.md'] !== undefined))
  } catch {
    return false
  }
}

const resetMarketState = () => {
  marketMode = 'searchMenu'
  marketSearchType = null
  marketResults = []
  marketPageStart = 0
  marketLastOperation = ''
  selectedMarketEntry = null
}

const returnFromPluginMarket = async (lines: ScriptLine[] = []) => {
  isPluginMarketActive.value = false
  isToolDeltaRunning.value = true
  isToolDeltaMenuActive.value = false
  await playLines([
    ...lines,
    mcLine('§a已从插件市场返回 ToolDelta 控制台。', 'success'),
  ], 12, 60)
  resetMarketState()
}

const filterMarketResults = (cache: MarketCache, searchType: MarketSearchType, keyword: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return []

  if (searchType === 'name') {
    return cache.showList.filter((entry) => getPluginName(entry, cache).toLowerCase().includes(normalizedKeyword))
  }

  if (searchType === 'author') {
    return cache.showList.filter((entry) => String(entry.data.author || '').toLowerCase().includes(normalizedKeyword))
  }

  const matched = cache.showList.find((entry) => entry.key.toLowerCase().includes(normalizedKeyword))
  return matched ? [matched] : []
}

const showMarketSearchMenu = async () => {
  marketMode = 'searchMenu'
  marketSearchType = null
  selectedMarketEntry = null
  await playLines(createMarketSearchMenuLines(), 14, 80)
}

const showMarketResults = async () => {
  marketMode = 'resultList'
  selectedMarketEntry = null
  await playLines(createMarketResultLines(), 12, 60)
}

const openMarketUrl = async (entry: MarketEntry) => {
  const url = entry.type === 'package'
    ? `/PluginMarket/?package=${encodeURIComponent(entry.key.replace(/^\[pkg\]/, ''))}`
    : `/PluginMarket/?plugin=${encodeURIComponent(entry.key)}`
  const pluginName = getPluginName(entry)

  await playLines([
    entry.type === 'package'
      ? mcLine(`§6开始下载整合包 ${entry.key.replace(/^\[pkg\]/, '')}`, 'warning')
      : mcLine(`§6正在下载插件：§f${pluginName}`, 'warning'),
    entry.type === 'package'
      ? mcLine('§a整合包下载完成', 'success')
      : mcLine(`§a已获取插件下载清单 §f${pluginName}§a`, 'success'),
    mcLine('§a网页终端不会写入本地文件，正在打开插件市场详情弹窗...', 'success'),
  ], 12, 60)
  if (typeof window !== 'undefined') {
    window.location.href = url
  }
}

const handlePluginMarketCommand = async (command: string) => {
  const normalized = command.toLowerCase()

  if (normalized === 'exit') {
    await returnFromPluginMarket()
    return
  }

  if (marketMode === 'searchMenu') {
    if (normalized === 'q') {
      await playLines([consoleUnknownCommandLine(command)], 12, 60)
      return
    }

    if (normalized === '1') {
      marketMode = 'awaitKeyword'
      marketSearchType = 'name'
      await playLines([mcLine('§6请输入插件名(中的关键词):', 'warning')], 12, 60)
      return
    }

    if (normalized === '2') {
      marketMode = 'awaitKeyword'
      marketSearchType = 'author'
      await playLines([mcLine('§6请输入插件作者名(中的关键词):', 'warning')], 12, 60)
      return
    }

    if (normalized === '3') {
      marketMode = 'awaitKeyword'
      marketSearchType = 'id'
      await playLines([mcLine('§6请输入插件ID(中的关键词):', 'warning')], 12, 60)
      return
    }

    if (normalized === '4') {
      const cache = await loadMarketCache()
      marketResults = cache.showList
      marketPageStart = 0
      marketLastOperation = ''
      await showMarketResults()
      return
    }

    await returnFromPluginMarket([
      mcLine('§6已退出。', 'warning'),
    ])
    return
  }

  if (marketMode === 'awaitKeyword') {
    const cache = await loadMarketCache()
    marketResults = marketSearchType ? filterMarketResults(cache, marketSearchType, command) : []
    marketPageStart = 0
    marketLastOperation = ''

    if (!marketResults.length) {
      marketMode = 'searchMenu'
      await playLines([mcLine('§c未找到匹配的插件; 回车键继续', 'error')], 12, 60)
      await showMarketSearchMenu()
      return
    }

    await showMarketResults()
    return
  }

  if (marketMode === 'resultList') {
    const operation = normalized || marketLastOperation
    if (operation) marketLastOperation = operation

    if (operation === '+') {
      marketPageStart = Math.min(
        Math.max(Math.floor(Math.max(marketResults.length - 1, 0) / MARKET_PAGE_SIZE) * MARKET_PAGE_SIZE, 0),
        marketPageStart + MARKET_PAGE_SIZE,
      )
      await showMarketResults()
      return
    }

    if (operation === '-') {
      marketPageStart = Math.max(0, marketPageStart - MARKET_PAGE_SIZE)
      await showMarketResults()
      return
    }

    if (operation === 'q') {
      await showMarketSearchMenu()
      return
    }

    const resultIndex = Number.parseInt(operation, 10)
    if (Number.isFinite(resultIndex) && resultIndex >= 1 && resultIndex <= marketResults.length) {
      selectedMarketEntry = marketResults[resultIndex - 1]

      if (selectedMarketEntry.type === 'package') {
        marketMode = 'packageDetail'
        await playLines(await createPackageDetailLines(selectedMarketEntry), 12, 60)
        return
      }

      marketMode = 'pluginDetail'
      await playLines(createPluginDetailLines(selectedMarketEntry, await hasPluginDoc(selectedMarketEntry)), 12, 60)
      return
    }

    await playLines([mcLine('§c超出序号范围', 'error')], 12, 60)
    return
  }

  if (marketMode === 'pluginDetail') {
    if (!selectedMarketEntry) {
      await showMarketSearchMenu()
      return
    }

    if (normalized === 'y') {
      await openMarketUrl(selectedMarketEntry)
      return
    }

    if (normalized === 'd') {
      if (await hasPluginDoc(selectedMarketEntry)) {
        await playLines([
          mcLine('§6正在读取文档..', 'warning'),
          mcLine('§a网页终端请在打开的插件详情弹窗中查看文档/源码链接。', 'success'),
        ], 12, 60)
      } else {
        await playLines([mcLine('§c该插件没有文档..', 'error')], 12, 60)
      }
      await showMarketResults()
      return
    }

    await playLines([mcLine('已取消。', 'muted')], 12, 60)
    await showMarketResults()
    return
  }

  if (marketMode === 'packageDetail') {
    if (!selectedMarketEntry) {
      await showMarketSearchMenu()
      return
    }

    if (normalized === 'y') {
      await openMarketUrl(selectedMarketEntry)
      return
    }

    await playLines([mcLine('已取消。', 'muted')], 12, 60)
    await showMarketResults()
  }
}

const getToolDeltaOptionLines = (option: string): ScriptLine[] => {
  switch (option) {
    case '1':
      return createToolDeltaStartupLines()
    case '2':
      return [
        mcLine('§f目前已安装的插件列表:', 'menu'),
        mcLine('§7 空空如也哦...', 'muted'),
        mcLine('§f输入u更新本地所有插件, 输入q退出', 'menu'),
        mcLine('§f输入插件关键词进行选择', 'menu'),
        mcLine('§f(空格可分隔关键词):', 'menu'),
      ]
    case '3':
      return createMarketSearchMenuLines()
    case '4':
      return [
        mcLine('§6ToolDelta 正在以仅初始插件模式启动', 'warning'),
        ...createWelcomeLines(),
        mcLine('§a配置文件读取完成', 'success'),
        mcLine('§aToolDelta 已初始化所有配置文件。', 'success'),
      ]
    case '5':
      return [mcLine('§c未初始化配置文件, 无法进行修改', 'error')]
    case '6':
      return [
        mcLine('§a快速启动模式已开启', 'success'),
        mcLine('§6删除本地的 §f快速启动.sig§6 文件即可取消快速启动功能', 'warning'),
      ]
    case 'q':
      return [mcLine('§aToolDelta 已退出.', 'success')]
    default:
      return [mcLine(`§c不合法的启动模式: ${option}`, 'error')]
  }
}

const scrollTerminalToBottom = async () => {
  await nextTick()
  if (terminalBody.value) {
    terminalBody.value.scrollTop = terminalBody.value.scrollHeight
  }
}

const hasActiveTextSelection = () => {
  const selection = window.getSelection()

  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0)
}

const focusTerminalInput = async () => {
  await nextTick()
  if (!isInputReady.value) return
  if (isFastBuilderStarted.value) return
  if (hasActiveTextSelection()) return
  terminalInput.value?.focus()
}

const pushLine = async (line: ScriptLine, charDelay = 18) => {
  const entry: TerminalLine = {
    id: ++lineId,
    text: '',
    segments: line.segments ? [] : undefined,
    isTyped: true,
    kind: line.kind,
  }

  terminalLines.value.push(entry)
  const lineIndex = terminalLines.value.length - 1
  await scrollTerminalToBottom()

  if (line.segments) {
    for (const segment of line.segments) {
      const style = {
        color: segment.color,
        backgroundColor: segment.backgroundColor,
        fontWeight: segment.fontWeight,
        fontStyle: segment.fontStyle,
        textDecoration: segment.textDecoration,
        borderRadius: segment.borderRadius,
        padding: segment.padding,
      }

      for (const char of segment.text) {
        if (disposed) return
        const currentLine = terminalLines.value[lineIndex]
        terminalLines.value[lineIndex] = {
          ...currentLine,
          text: currentLine.text + char,
          segments: appendStyledTextImmutable(currentLine.segments ?? [], char, style),
        }
        await scrollTerminalToBottom()
        await sleep(charDelay)
      }
    }

    return
  }

  for (const char of line.text) {
    if (disposed) return
    const currentLine = terminalLines.value[lineIndex]
    terminalLines.value[lineIndex] = {
      ...currentLine,
      text: currentLine.text + char,
    }
    await scrollTerminalToBottom()
    await sleep(charDelay)
  }
}

const playLines = async (lines: ScriptLine[], charDelay = 18, lineDelay = 180) => {
  isTyping.value = true
  isInputReady.value = false
  const scaledCharDelay = Math.max(1, Math.round(charDelay * TYPE_DELAY_SCALE))
  const scaledLineDelay = Math.max(0, Math.round(lineDelay * TYPE_DELAY_SCALE))
  const effectiveCharDelay = reduceMotion.value ? 1 : scaledCharDelay
  const effectiveLineDelay = reduceMotion.value ? 0 : scaledLineDelay

  try {
    for (const line of lines) {
      if (disposed) break
      await pushLine(line, line.kind === 'ascii' || line.kind === 'logo'
        ? Math.min(4, effectiveCharDelay)
        : effectiveCharDelay)
      if (effectiveLineDelay > 0) await sleep(effectiveLineDelay)
    }
  } finally {
    isInputReady.value = true
    isTyping.value = false
    await scrollTerminalToBottom()
    await focusTerminalInput()
  }
}

const playFastBuilderLines = async () => {
  isTyping.value = true
  isInputReady.value = false

  try {
    for (const line of fastBuilderLines) {
      if (disposed) break
      await pushLine(line, 16)
      if (!reduceMotion.value) await sleep(120)
    }

    const checkingLine: TerminalLine = {
      id: ++lineId,
      text: '正在检查更新，请稍等... ',
      isTyped: true,
      kind: 'muted',
    }

    terminalLines.value.push(checkingLine)
    const checkingLineIndex = terminalLines.value.length - 1
    await scrollTerminalToBottom()
    await sleep(5000)

    if (!disposed) {
      for (const char of '失败') {
        terminalLines.value[checkingLineIndex].text += char
        await scrollTerminalToBottom()
        await sleep(16)
      }
    }
  } finally {
    isFastBuilderStarted.value = false
    isInputReady.value = true
    isTyping.value = false
    await scrollTerminalToBottom()
    await focusTerminalInput()
  }
}

const resetTerminal = async (hideInput = false) => {
  if (hideInput) isInputReady.value = false
  terminalLines.value = []
  await playLines(getInitialLines())
  isInputReady.value = true
  await focusTerminalInput()
}

const playToolDeltaMenu = async () => {
  terminalLines.value = []
  isToolDeltaMenuActive.value = true
  isToolDeltaRunning.value = false
  isPluginMarketActive.value = false
  resetMarketState()
  await scrollTerminalToBottom()
  await playLines(createToolDeltaMenuLines(), 16, 120)
}

const playToolDeltaMenuOption = async (command: string) => {
  const normalized = command.toLowerCase()

  if (normalized === '3') {
    await enterPluginMarket()
    return
  }

  const lines = getToolDeltaOptionLines(normalized)

  if (normalized === '1') {
    isToolDeltaMenuActive.value = false
    isToolDeltaRunning.value = true
    isPluginMarketActive.value = false
    resetMarketState()
  }

  if (normalized === 'q') {
    isToolDeltaMenuActive.value = false
    isToolDeltaRunning.value = false
    isPluginMarketActive.value = false
    resetMarketState()
  }

  await playLines(lines, 16, 140)
}

const enterPluginMarket = async () => {
  isToolDeltaMenuActive.value = false
  isToolDeltaRunning.value = true
  isPluginMarketActive.value = true
  resetMarketState()
  await playLines([mcLine('§6正在连接到插件市场..', 'warning')], 12, 60)
  try {
    const cache = await loadMarketCache()
    await playLines(createMarketSearchMenuLines(cache), 12, 60)
  } catch (error) {
    await returnFromPluginMarket([
      mcLine(`§c获取插件市场插件出现问题, 报错: ${error instanceof Error ? error.message : String(error)}`, 'error'),
    ])
  }
}

const submitCommand = async () => {
  if (isTyping.value) return

  const rawCommand = commandInput.value
  const command = rawCommand.trim()

  if (!command) return

  commandInput.value = ''
  terminalLines.value.push({
    id: ++lineId,
    text: `${promptText.value} ${rawCommand}`,
    kind: 'prompt',
  })
  await scrollTerminalToBottom()

  const normalized = command.toLowerCase()
  const launchArgMatch = normalized.match(/^tooldelta\s+-l\s+(\S+)$/)

  if (normalized === 'clear') {
    isFastBuilderStarted.value = false
    terminalLines.value = []
    isInputReady.value = true
    await scrollTerminalToBottom()
    await focusTerminalInput()
    return
  }

  if (launchArgMatch) {
    isFastBuilderStarted.value = false
    isToolDeltaRunning.value = false
    isPluginMarketActive.value = false
    isToolDeltaMenuActive.value = true
    resetMarketState()
    await playToolDeltaMenuOption(launchArgMatch[1])
    return
  }

  if (normalized === 'tooldelta') {
    isFastBuilderStarted.value = false
    isToolDeltaRunning.value = false
    isPluginMarketActive.value = false
    resetMarketState()
    await playToolDeltaMenu()
    await focusTerminalInput()
    return
  }

  if (
    normalized === 'fastbuilder' &&
    !isToolDeltaMenuActive.value &&
    !isToolDeltaRunning.value &&
    !isPluginMarketActive.value
  ) {
    terminalLines.value = []
    isFastBuilderStarted.value = true
    isToolDeltaMenuActive.value = false
    isToolDeltaRunning.value = false
    isPluginMarketActive.value = false
    resetMarketState()
    isInputReady.value = false
    await scrollTerminalToBottom()
    await playFastBuilderLines()
    return
  }

  if (isPluginMarketActive.value) {
    await handlePluginMarketCommand(command)
    return
  }

  if (isToolDeltaRunning.value) {
    if (normalized === 'exit') {
      isToolDeltaMenuActive.value = true
      isToolDeltaRunning.value = false
      isPluginMarketActive.value = false
      resetMarketState()
      await playLines(createToolDeltaMenuOnlyLines(), 16, 120)
      return
    }

    if (normalized === 'help' || normalized === '?' || normalized === '？' || normalized === '帮助') {
      await playLines(createToolDeltaConsoleHelpLines(), 14, 80)
      return
    }

    if (normalized === '插件市场' || normalized === 'pluginmarket') {
      await enterPluginMarket()
      return
    }

    await playLines([consoleUnknownCommandLine(command)], 14, 80)
    return
  }

  if (isToolDeltaMenuActive.value) {
    await playToolDeltaMenuOption(command)
    return
  }

  await playLines([
    { text: `Command '${command}' not found`, kind: 'error' },
  ])
}

const focusTerminal = () => {
  if (isTyping.value) return
  if (hasActiveTextSelection()) return
  terminalInput.value?.focus()
}

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  void resetTerminal(true)
})

onBeforeUnmount(() => {
  disposed = true
})
</script>

<template>
  <main class="td-not-found" aria-labelledby="td-not-found-title">
    <div class="td-not-found__glow td-not-found__glow--primary" />
    <div class="td-not-found__glow td-not-found__glow--secondary" />

    <section class="td-not-found__shell">
      <div class="td-not-found__content">
        <p class="td-not-found__eyebrow">ToolDelta Wiki / Missing Document</p>
        <h1 id="td-not-found-title" class="td-not-found__code">404</h1>
        <h2 class="td-not-found__title">页面好像掉进了租赁服的虚空。</h2>
        <p class="td-not-found__desc">
          没有找到对应的文档路径。你可以返回首页重新出发。
        </p>

        <div class="td-not-found__actions" aria-label="404 页面导航">
          <a class="td-not-found__button td-not-found__button--primary" href="/">
            返回首页
          </a>
          <a class="td-not-found__button" href="/plugin-dev/">
            插件开发指南
          </a>
          <a class="td-not-found__button" href="/PluginMarket/">
            插件市场
          </a>
        </div>
      </div>

      <aside class="td-terminal" aria-label="ToolDelta Wiki 404 Terminal" @click="focusTerminal">
        <div class="td-terminal__head">
          <span class="td-terminal__dot td-terminal__dot--red" />
          <span class="td-terminal__dot td-terminal__dot--yellow" />
          <span class="td-terminal__dot td-terminal__dot--green" />
          <span class="td-terminal__title">ToolDelta Wiki 404 Terminal</span>
        </div>

        <div ref="terminalBody" class="td-terminal__body" role="log" aria-live="polite">
          <p
            v-for="line in terminalLines"
            :key="line.id"
            class="td-terminal__line"
            :class="[line.kind && `is-${line.kind}`, { 'is-typed': line.isTyped }]"
          >
            <template v-if="line.segments?.length">
              <span
                v-for="(segment, index) in line.segments"
                :key="`${line.id}-${index}-${segment.text.length}`"
                class="td-terminal__segment"
                :style="{
                  color: segment.color,
                  backgroundColor: segment.backgroundColor,
                  fontWeight: segment.fontWeight,
                  fontStyle: segment.fontStyle,
                  textDecoration: segment.textDecoration,
                  borderRadius: segment.borderRadius,
                  padding: segment.padding,
                  textShadow: segment.backgroundColor ? 'none' : undefined,
                }"
              >{{ segment.text }}</span>
            </template>
            <template v-else>{{ line.text }}</template>
          </p>
          <form
            v-if="isInputReady"
            class="td-terminal__input-row"
            :class="{ 'is-busy': isTyping }"
            @submit.prevent="submitCommand"
          >
            <label class="td-terminal__prompt" for="td-terminal-command">{{ promptText }}</label>
            <span class="td-terminal__input-wrap">
              <span class="td-terminal__visible-input" aria-hidden="true">{{ visibleCommand }}</span>
              <span class="td-terminal__cursor" aria-hidden="true" />
              <input
                id="td-terminal-command"
                ref="terminalInput"
                v-model="commandInput"
                class="td-terminal__input"
                type="text"
                autocomplete="off"
                spellcheck="false"
                :readonly="isTyping"
                aria-label="输入终端命令"
                @focus="isTerminalFocused = true"
                @blur="isTerminalFocused = false"
              />
            </span>
          </form>
        </div>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.td-not-found {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: calc(100vh - var(--vp-nav-height));
  padding: 92px 24px 104px;
  background:
    radial-gradient(circle at 10% 18%, rgba(23, 253, 234, 0.14), transparent 30%),
    radial-gradient(circle at 87% 26%, rgba(42, 78, 255, 0.22), transparent 34%),
    radial-gradient(circle at 78% 82%, rgba(95, 228, 255, 0.14), transparent 28%),
    linear-gradient(180deg, var(--vp-c-bg) 0%, #111827 100%);
}

.td-not-found__glow {
  position: absolute;
  z-index: -1;
  border-radius: 999px;
  filter: blur(14px);
  opacity: 0.75;
}

.td-not-found__glow--primary {
  top: 98px;
  right: max(4vw, 32px);
  width: 260px;
  height: 260px;
  background: rgba(95, 228, 255, 0.2);
}

.td-not-found__glow--secondary {
  bottom: 86px;
  left: max(3vw, 28px);
  width: 280px;
  height: 280px;
  background: rgba(42, 78, 255, 0.22);
}

.td-not-found__shell {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
  gap: 48px;
  align-items: center;
  margin: 0 auto;
  max-width: 1180px;
}

.td-not-found__content {
  min-width: 0;
}

.td-not-found__eyebrow {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.td-not-found__code {
  margin: 0;
  width: fit-content;
  letter-spacing: -0.08em;
  line-height: 0.86;
  font-size: clamp(112px, 18vw, 210px);
  font-weight: 900;
  color: transparent;
  background: linear-gradient(90deg, rgba(42, 78, 255, 0.789) 0%, rgb(95, 228, 255) 60%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 18px 34px rgba(20, 77, 190, 0.18));
}

.td-not-found__title {
  margin: 22px 0 0;
  max-width: 620px;
  line-height: 1.18;
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  color: var(--vp-c-text-1);
}

.td-not-found__desc {
  margin: 18px 0 0;
  max-width: 610px;
  line-height: 1.78;
  font-size: 16px;
  color: var(--vp-c-text-2);
}

.td-not-found__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}

.td-not-found__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0 18px;
  min-height: 42px;
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 82%, transparent);
  box-shadow: 0 10px 24px rgba(20, 77, 190, 0.08);
  transition:
    border-color 0.25s,
    color 0.25s,
    background 0.25s,
    transform 0.25s,
    box-shadow 0.25s;
}

.td-not-found__button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(20, 77, 190, 0.14);
}

.td-not-found__button--primary {
  border-color: #0bbfdb;
  color: #fff;
  background: linear-gradient(120deg, #144dbe, #0bbfdb);
}

.td-not-found__button--primary:hover {
  border-color: #12d8ea;
  color: #fff;
  background: linear-gradient(120deg, #1d5ee4, #12d8ea);
}

.td-terminal {
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 24px;
  min-width: 0;
  height: 492px;
  cursor: text;
  background:
    radial-gradient(circle at 80% 18%, rgba(0, 255, 255, 0.16), transparent 24%),
    radial-gradient(circle at 20% 86%, rgba(42, 78, 255, 0.2), transparent 30%),
    rgba(17, 17, 17, 0.94);
  box-shadow:
    0 34px 88px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(0, 255, 255, 0.1),
    0 0 34px rgba(0, 255, 255, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
}

.td-terminal__head {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 15px 18px;
}

.td-terminal__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.td-terminal__dot--red {
  background: #ff5f57;
}

.td-terminal__dot--yellow {
  background: #ffbd2e;
}

.td-terminal__dot--green {
  background: #28c840;
}

.td-terminal__title {
  margin-left: 8px;
  font-family: "Space Mono", var(--vp-font-family-mono), monospace;
  font-size: 13px;
  font-weight: 700;
  color: #0ff;
  text-shadow: 0 0 0.5em cyan;
}

.td-terminal__body {
  box-sizing: border-box;
  overflow: auto;
  padding: 24px 24px 22px;
  height: 440px;
  font-family: "Space Mono", var(--vp-font-family-mono), monospace;
  font-size: 13px;
  line-height: 1.55;
  color: #ffffffde;
  scrollbar-color: rgba(0, 255, 255, 0.42) transparent;
  user-select: text;
  -webkit-user-select: text;
}

.td-terminal__body ::selection {
  color: #111;
  background: rgba(0, 255, 255, 0.86);
  text-shadow: none;
  -webkit-text-fill-color: #111;
}

.td-terminal__body ::-moz-selection {
  color: #111;
  background: rgba(0, 255, 255, 0.86);
  text-shadow: none;
}

.td-terminal__line {
  margin: 0 0 8px;
  width: max-content;
  min-width: 100%;
  white-space: pre;
  user-select: text;
  -webkit-user-select: text;
  animation: td-terminal-line-in 0.4s ease-in-out;
}

.td-terminal__line.is-typed {
  animation: none;
}

.td-terminal__line.is-prompt {
  color: #0ff;
  text-shadow: 0 0 0.5em cyan;
}

.td-terminal__line.is-error {
  color: #ff6b7a;
}

.td-terminal__line.is-success {
  color: #55ff55;
  text-shadow: 0 0 0.45em rgba(85, 255, 85, 0.7);
}

.td-terminal__line.is-muted {
  color: rgba(255, 255, 255, 0.74);
}

.td-terminal__line.is-warning {
  color: #ffd400;
}

.td-terminal__line.is-menu {
  color: #ffffffde;
}

.td-terminal__line.is-link {
  display: inline-block;
  border: 1px solid rgba(255, 255, 255, 0.48);
  padding: 6px 12px;
  min-width: auto;
  color: #0ff;
  text-shadow: 0 0 0.5em cyan;
}

.td-terminal__line.is-ascii {
  margin-bottom: 2px;
  color: #0ff;
  text-shadow:
    0 0 0.5em cyan,
    0 0 22px rgba(0, 255, 255, 0.2);
}

.td-terminal__line.is-logo {
  margin-bottom: 2px;
  font-weight: 800;
  color: #ffffffde;
  text-shadow:
    0 0 0.35em currentColor,
    0 0 20px rgba(0, 255, 255, 0.16);
}

.td-terminal__segment {
  text-shadow: inherit;
}

.td-terminal__input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  min-width: 100%;
}

.td-terminal__input-row.is-busy {
  pointer-events: none;
}

.td-terminal__prompt {
  color: #0ff;
  font-weight: 800;
  text-shadow: 0 0 0.5em cyan;
}

.td-terminal__input-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 120px;
}

.td-terminal__visible-input {
  position: relative;
  z-index: 1;
  min-width: 1ch;
  color: #ffffffde;
  white-space: pre;
}

.td-terminal__input {
  position: absolute;
  z-index: 0;
  inset: 0;
  border: 0;
  outline: 0;
  padding: 0;
  width: 100%;
  color: transparent;
  background: transparent;
  font: inherit;
  caret-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.td-terminal__cursor {
  position: relative;
  z-index: 2;
  display: inline-block;
  margin-left: 1px;
  width: 8px;
  height: 1.2em;
  background-color: #0ff;
  box-shadow: 0 0 0.5em cyan;
  pointer-events: none;
  animation: td-terminal-caret-blink 1s steps(1, end) infinite !important;
}

@keyframes td-terminal-line-in {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@keyframes td-terminal-caret-blink {
  0%,
  49% {
    background-color: #0ff;
    box-shadow: 0 0 0.5em cyan;
  }

  50%,
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .td-not-found__button,
  .td-terminal__line {
    transition: none;
    animation: none;
  }

  .td-terminal__cursor {
    animation: td-terminal-caret-blink 1s steps(1, end) infinite !important;
  }
}

@media (max-width: 920px) {
  .td-not-found {
    padding: 72px 20px 88px;
  }

  .td-not-found__shell {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .td-not-found__code {
    font-size: clamp(96px, 30vw, 148px);
  }

  .td-terminal__body {
    height: 340px;
  }

  .td-terminal {
    height: 392px;
  }
}

@media (max-width: 520px) {
  .td-not-found {
    padding-right: 18px;
    padding-left: 18px;
  }

  .td-not-found__actions,
  .td-not-found__button {
    width: 100%;
  }

  .td-terminal {
    border-radius: 20px;
    height: 368px;
  }

  .td-terminal__head {
    padding-right: 14px;
    padding-left: 14px;
  }

  .td-terminal__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .td-terminal__body {
    padding: 18px 16px;
    height: 320px;
    font-size: 12px;
  }
}
</style>
