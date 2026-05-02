<template>
  <div class="market-container">
    <div class="market-header">
      <h2>插件与整合包市场</h2>
      <p class="subtitle">
        ToolDelta 插件市场是 ToolDelta 的官方插件市场源。
        <template v-if="!loading">
          现在已经拥有 <strong>{{ pluginCount }}</strong> 个插件、<strong>{{ packageCount }}</strong> 个整合包了！
        </template>
      </p>
    </div>

    <!-- Controls Section (Search Only) -->
    <div class="controls-wrapper">
      <div class="search-bar">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索插件、作者或描述..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="plugin-grid">
      <div v-for="n in 6" :key="n" class="plugin-card skeleton-card">
        <div class="plugin-card-surface">
          <div class="card-main">
            <div class="card-header">
              <div class="skeleton-icon"></div>
              <div class="title-wrapper">
                <div class="skeleton-line w-60"></div>
                <div class="skeleton-line w-40 small"></div>
              </div>
            </div>
            <div class="skeleton-line w-100"></div>
            <div class="skeleton-line w-80"></div>
          </div>
          <div class="skeleton-footer"></div>
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div v-else>
      <div v-if="filteredList.length === 0" class="no-results">
        <div class="empty-state-icon">🔍</div>
        <h3>未找到匹配项</h3>
        <p>尝试更换关键词</p>
      </div>

      <div v-else class="plugin-grid" ref="gridContainer" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
        <div
          v-for="item in filteredList"
          :key="item.name"
          class="plugin-card"
          :class="{ 'is-package': item.isPackage }"
          @click="showFullDescription(item)"
        >
          <div class="plugin-card-surface">
            <div class="card-main">
              <div class="card-header">
                <div class="icon-wrapper">
                  <span v-if="item.isPackage">📦</span>
                  <span v-else>🧩</span>
                </div>
                <div class="title-wrapper">
                  <div class="plugin-name">{{ item.name.replace('[整合包] ', '') }}</div>
                  <div class="plugin-author">by {{ item.author }}</div>
                </div>
              </div>

              <div class="card-body">
                <div
                  class="plugin-description"
                  v-html="parseMinecraftColor(item.description || '暂无描述')"
                ></div>
              </div>
            </div>

            <div class="card-footer">
              <span class="version-tag">v{{ item.version }}</span>
              <div class="footer-actions">
                <button class="action-btn copy-btn" @click.stop="handleCopy(item)" :class="{ 'copied': copiedStates[getCopyStateKey(item)] }">
                  <span v-if="copiedStates[getCopyStateKey(item)]">✓ 已复制</span>
                  <span v-else>📋 复制指令</span>
                </button>
                <button class="action-btn" @click.stop="openGithub(item)">
                  源码
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Transition name="modal-fade">
      <div v-if="modalVisible" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-type-icon">{{ currentItem?.isPackage ? '📦' : '🧩' }}</span>
              <div>
                <h3>{{ currentItem?.name.replace('[整合包] ', '') }}</h3>
                <span class="modal-subtitle">by {{ currentItem?.author }}</span>
              </div>
            </div>
            <button class="modal-close" @click="goBackOrCloseModal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-info-bar">
              <div class="info-item">
                <span class="label">版本</span>
                <span class="value">{{ currentItem?.version }}</span>
              </div>
              <div class="info-item">
                <span class="label">类型</span>
                <span class="value">{{ currentItem?.isPackage ? '整合包' : '单体插件' }}</span>
              </div>
            </div>

            <div class="description-container">
              <h4>详细介绍</h4>
              <div
                class="modal-description-text"
                v-html="parseMinecraftColor(currentItem?.description || '暂无描述')"
              ></div>
            </div>

            <div v-if="currentItem?.isPackage" class="included-plugins-section">
              <div class="section-header">
                <h4>
                  包含插件
                  <span v-if="currentItem.includedPlugins?.length" class="count-badge">
                    {{ currentItem.includedPlugins.length }}
                  </span>
                </h4>
              </div>

              <div v-if="!currentItem.includedPlugins?.length" class="empty-plugins-msg">
                此整合包不包含插件，仅包含数据文件
              </div>

              <div v-else class="included-plugins-list">
                <div
                  v-for="plugin in currentItem.includedPlugins"
                  :key="plugin.pluginId || plugin.name"
                  class="included-plugin-item"
                  :class="{ 'is-clickable': canOpenIncludedPlugin(plugin) }"
                  :tabindex="canOpenIncludedPlugin(plugin) ? 0 : undefined"
                  :role="canOpenIncludedPlugin(plugin) ? 'button' : undefined"
                  @click.stop="showIncludedPlugin(plugin)"
                  @keydown.enter.prevent="showIncludedPlugin(plugin)"
                  @keydown.space.prevent="showIncludedPlugin(plugin)"
                >
                  <div class="plugin-info">
                    <span class="included-plugin-name">{{ plugin.name }}</span>
                    <span class="included-plugin-author">by {{ plugin.author }}</span>
                  </div>
                  <span class="included-plugin-version">v{{ plugin.version }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="primary-btn" @click="openGithub(currentItem)">
              <svg style="margin-right:6px" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              在 GitHub 上查看
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, reactive } from 'vue'

const itemList = ref([])
const loading = ref(true)
const pluginNameMap = ref({})      // display name -> install id
const pluginFolderMap = ref({})    // display name -> folder path for GitHub/assets
const searchQuery = ref('')
const modalVisible = ref(false)
const currentItem = ref(null)
const modalParentItem = ref(null)
const copiedStates = reactive({})  // Use reactive for object property reactivity
let modalResetTimer = null
let queryTargetOpened = false

const PRIMARY_MARKET_BASE_URL = 'https://pm.tooldelta.top'
const GITHUB_RAW_MARKET_BASE_URL = 'https://raw.githubusercontent.com/ToolDelta-Basic/PluginMarket/refs/heads/main'

const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/$/, '')
const encodeMarketPath = (path) => String(path).split('/').map(encodeURIComponent).join('/')
const getMarketFileUrl = (baseUrl, path) => `${normalizeBaseUrl(baseUrl)}/${encodeMarketPath(path)}`

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${url}`)
  }
  return response.json()
}

const resolveMarketBaseUrl = async () => {
  try {
    const response = await fetch(`${PRIMARY_MARKET_BASE_URL}/`, { cache: 'no-store' })
    if (response.status === 403) {
      console.warn('Primary plugin market returned 403, using GitHub raw source.')
      return GITHUB_RAW_MARKET_BASE_URL
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return PRIMARY_MARKET_BASE_URL
  } catch (error) {
    console.warn('Primary plugin market unavailable, using GitHub raw source:', error)
    return GITHUB_RAW_MARKET_BASE_URL
  }
}

const loadMarketSource = async () => {
  const marketBaseUrl = await resolveMarketBaseUrl()

  try {
    const [data, pluginIdsMap] = await Promise.all([
      fetchJson(getMarketFileUrl(marketBaseUrl, 'market_tree.json')),
      fetchJson(getMarketFileUrl(marketBaseUrl, 'plugin_ids_map.json'))
    ])
    return { data, pluginIdsMap, marketBaseUrl }
  } catch (error) {
    if (marketBaseUrl === GITHUB_RAW_MARKET_BASE_URL) throw error
    console.warn('Primary plugin market data failed, using GitHub raw source:', error)
    const [data, pluginIdsMap] = await Promise.all([
      fetchJson(getMarketFileUrl(GITHUB_RAW_MARKET_BASE_URL, 'market_tree.json')),
      fetchJson(getMarketFileUrl(GITHUB_RAW_MARKET_BASE_URL, 'plugin_ids_map.json'))
    ])
    return { data, pluginIdsMap, marketBaseUrl: GITHUB_RAW_MARKET_BASE_URL }
  }
}

// Minecraft Color Maps
const colorMaps = {
  dark: { '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA', '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA', '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF', 'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF', 'g': '#DDD605', 'h': '#E3D4D1', 'i': '#CECACA', 'j': '#443A3B', 'm': '#971607', 'n': '#B4684D', 'p': '#DEB12D', 'q': '#47A036', 's': '#2CBAA8', 't': '#21497B', 'u': '#9A5CC6', 'v': '#EB7114' },
  light: { '0': '#000000', '1': '#000088', '2': '#008800', '3': '#008888', '4': '#880000', '5': '#880088', '6': '#8F6500', '7': '#666666', '8': '#333333', '9': '#3333CC', 'a': '#339933', 'b': '#007070', 'c': '#CC3333', 'd': '#AA22AA', 'e': '#857400', 'f': '#333333', 'g': '#8F6B00', 'h': '#757575', 'i': '#595959', 'j': '#443A3B', 'm': '#880000', 'n': '#885533', 'p': '#805E00', 'q': '#338833', 's': '#338888', 't': '#21497B', 'u': '#883388', 'v': '#AA5500' }
}

// Reactive theme state
const isDark = ref(false)
let themeObserver = null

// Mouse tracking for border glow
const gridContainer = ref(null)
const visibleCards = new Set()
const cardRects = new Map()
let mouseMoveRaf = null
let rectUpdateRaf = null
let cardsObserver = null
let isMouseInGrid = false
let activeHoverCard = null
const mousePos = { x: 0, y: 0 }
const MOUSE_THRESHOLD = 350

const getCardSurface = (card) => card.querySelector('.plugin-card-surface') || card

const isPointInRect = (x, y, rect) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

const updateCardRects = () => {
  for (const card of visibleCards) {
    cardRects.set(card, getCardSurface(card).getBoundingClientRect())
  }
}

const clearCardInteraction = () => {
  if (activeHoverCard) {
    activeHoverCard.classList.remove('hover-active')
    activeHoverCard = null
  }
  for (const card of visibleCards) {
    card.classList.remove('glow-active', 'hover-active')
  }
}

const syncMouseGridState = () => {
  if (!gridContainer.value) return false
  isMouseInGrid = isPointInRect(mousePos.x, mousePos.y, gridContainer.value.getBoundingClientRect())
  if (!isMouseInGrid) clearCardInteraction()
  return isMouseInGrid
}

const updateGlowForMouse = () => {
  const { x, y } = mousePos
  let nextHoverCard = null

  for (const card of visibleCards) {
    const rect = cardRects.get(card)
    if (!rect) continue
    const surface = getCardSurface(card)
    const isPointerOverCard = isPointInRect(x, y, rect)
    const cardCenterX = rect.left + rect.width / 2
    const cardCenterY = rect.top + rect.height / 2
    const dist = Math.hypot(x - cardCenterX, y - cardCenterY)

    if (isPointerOverCard && !nextHoverCard) nextHoverCard = card

    if (dist < MOUSE_THRESHOLD) {
      surface.style.setProperty('--mouse-x', `${x - rect.left}px`)
      surface.style.setProperty('--mouse-y', `${y - rect.top}px`)
      card.classList.add('glow-active')
    } else {
      card.classList.remove('glow-active')
    }
  }

  if (activeHoverCard && activeHoverCard !== nextHoverCard) {
    activeHoverCard.classList.remove('hover-active')
  }

  activeHoverCard = nextHoverCard

  for (const card of visibleCards) {
    card.classList.toggle('hover-active', card === activeHoverCard)
  }
}

const scheduleRectUpdate = () => {
  if (rectUpdateRaf) return
  rectUpdateRaf = requestAnimationFrame(() => {
    updateCardRects()
    if (syncMouseGridState()) updateGlowForMouse()
    rectUpdateRaf = null
  })
}

const setupCardObserver = () => {
  if (!gridContainer.value) return
  if (cardsObserver) cardsObserver.disconnect()
  visibleCards.clear()
  cardRects.clear()
  cardsObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        visibleCards.add(entry.target)
        cardRects.set(entry.target, getCardSurface(entry.target).getBoundingClientRect())
      } else {
        entry.target.classList.remove('glow-active', 'hover-active')
        if (entry.target === activeHoverCard) activeHoverCard = null
        visibleCards.delete(entry.target)
        cardRects.delete(entry.target)
      }
    }
    if (isMouseInGrid) scheduleRectUpdate()
  }, { root: null, rootMargin: '200px' })

  gridContainer.value.querySelectorAll('.plugin-card').forEach(card => cardsObserver.observe(card))
  scheduleRectUpdate()
}

const onMouseMove = (e) => {
  isMouseInGrid = true
  mousePos.x = e.clientX
  mousePos.y = e.clientY
  if (!visibleCards.size) {
    clearCardInteraction()
    return
  }
  if (mouseMoveRaf) return

  mouseMoveRaf = requestAnimationFrame(() => {
    updateCardRects()
    updateGlowForMouse()
    mouseMoveRaf = null
  })
}

const onMouseLeave = () => {
  isMouseInGrid = false
  clearCardInteraction()
}

const onScrollOrResize = () => scheduleRectUpdate()

const parseMinecraftColor = (text) => {
  if (!text) return ''
  let result = ''
  let currentColor = null
  let i = 0
  const colorMap = isDark.value ? colorMaps.dark : colorMaps.light

  while (i < text.length) {
    if (text[i] === '§' && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase()
      if (code === 'r') {
        if (currentColor) { result += '</span>'; currentColor = null }
        i += 2
        continue
      }
      if (colorMap[code]) {
        if (currentColor) result += '</span>'
        currentColor = colorMap[code]
        result += `<span style="color: ${currentColor}">`
        i += 2
        continue
      }
    }
    result += text[i]
    i++
  }
  if (currentColor) result += '</span>'
  return result
}

const filteredList = computed(() => {
  let list = itemList.value
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    )
  }
  return list
})

const pluginCount = computed(() => itemList.value.filter(i => !i.isPackage).length)
const packageCount = computed(() => itemList.value.filter(i => i.isPackage).length)

watch(filteredList, () => nextTick(setupCardObserver), { flush: 'post' })

const getInstallCmd = (item) => {
  if (!item) return ''
  const installId = pluginNameMap.value[item.name]
    || (item.isPackage ? item.originalName : item.pluginId)
    || item.name
  return `plg add ${installId}`
  // return `plg add ${installId} -url https://pm.tooldelta.top`
}

// Generate stable key for copiedStates to avoid collisions
const getCopyStateKey = (item) => {
  if (!item) return ''
  const installId = pluginNameMap.value[item.name]
    || (item.isPackage ? item.originalName : item.pluginId)
    || item.name
  return `${item.isPackage ? 'pkg' : 'plugin'}_${installId}`
}

const getIncludedPluginDetail = (plugin) => {
  if (!plugin) return null
  return itemList.value.find(item =>
    !item.isPackage &&
    (
      (plugin.pluginId && item.pluginId === plugin.pluginId) ||
      (plugin.name && item.name === plugin.name)
    )
  ) || null
}

const canOpenIncludedPlugin = (plugin) => Boolean(getIncludedPluginDetail(plugin))

const showIncludedPlugin = (plugin) => {
  const detail = getIncludedPluginDetail(plugin)
  if (!detail) return
  if (currentItem.value?.isPackage) {
    modalParentItem.value = currentItem.value
  }
  currentItem.value = detail
  nextTick(() => {
    document.querySelector('.modal-content .modal-body')?.scrollTo({ top: 0 })
  })
}

const handleCopy = (item) => {
  executeCopy(item)
}

const executeCopy = async (item) => {
  const cmd = getInstallCmd(item)
  const stateKey = getCopyStateKey(item)
  try {
    await navigator.clipboard.writeText(cmd)
    copiedStates[stateKey] = true
    setTimeout(() => {
      copiedStates[stateKey] = false
    }, 2000)
  } catch (err) {
    console.error('Copy failed', err)
    // Fallback for older browsers
    alert('复制失败，请手动复制：' + cmd)
  }
}

const openGithub = (item) => {
  if (!item) return
  const baseUrl = 'https://github.com/ToolDelta-Basic/PluginMarket/tree/main'
  let path = ''
  if (item.isPackage) {
    const packageName = item.name.replace('[整合包] ', '')
    path = `/%5Bpkg%5D${encodeURIComponent(packageName)}`
  } else {
    const pluginFolderName = pluginFolderMap.value[item.name]
    if (pluginFolderName) path = `/${encodeURIComponent(pluginFolderName)}`
  }
  if (path) window.open(baseUrl + path, '_blank')
}

const showFullDescription = (item) => {
  if (modalResetTimer) clearTimeout(modalResetTimer)
  modalParentItem.value = null
  currentItem.value = item
  modalVisible.value = true
}

const openQueryTargetModal = () => {
  if (typeof window === 'undefined') return false
  if (queryTargetOpened) return false
  const params = new URLSearchParams(window.location.search)
  const pluginId = params.get('plugin')
  const packageName = params.get('package')

  if (!pluginId && !packageName) return false

  const target = itemList.value.find(item => {
    if (pluginId) return !item.isPackage && item.pluginId === pluginId
    return item.isPackage && item.originalName === packageName
  })

  if (!target) return false
  queryTargetOpened = true
  showFullDescription(target)
  return true
}

watch(itemList, () => {
  if (!modalVisible.value) nextTick(openQueryTargetModal)
}, { flush: 'post' })

const goBackOrCloseModal = () => {
  if (!modalParentItem.value) {
    closeModal()
    return
  }

  currentItem.value = modalParentItem.value
  modalParentItem.value = null
  nextTick(() => {
    document.querySelector('.modal-content .modal-body')?.scrollTo({ top: 0 })
  })
}

const closeModal = () => {
  modalVisible.value = false
  modalParentItem.value = null
  modalResetTimer = setTimeout(() => currentItem.value = null, 300)
}

onMounted(() => {
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize)

  // Initialize theme observer
  isDark.value = document.documentElement.classList.contains('dark')
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  loadMarketSource()
    .then(({ data, pluginIdsMap, marketBaseUrl }) => {
      const packages = Object.entries(data.Packages).map(([key, val]) => {
        const displayName = `[整合包] ${key}`
        pluginNameMap.value[displayName] = key
        return {
          name: displayName,
          originalName: key,
          author: val.author,
          version: val.version,
          description: val.description,
          isPackage: true,
          includedPlugins: (val['plugin-ids'] || []).map(id => {
            const p = data.MarketPlugins[id]
            return p
              ? { name: p.name, author: p.author, version: p.version, pluginId: id }
              : { name: id, author: '未知', version: '?', pluginId: id }
          })
        }
      })

      const plugins = []
      const descTasks = []

      for (const pluginId in data.MarketPlugins) {
        const info = data.MarketPlugins[pluginId]
        const folderName = pluginIdsMap[pluginId]
        if (folderName) {
          pluginNameMap.value[info.name] = pluginId
          pluginFolderMap.value[info.name] = folderName
          plugins.push({ ...info, pluginId, description: '加载中...', isPackage: false })
          const targetIndex = packages.length + plugins.length - 1
          descTasks.push({ targetIndex, folderName })
        }
      }

      itemList.value = [...packages, ...plugins]
      loading.value = false
      nextTick(openQueryTargetModal)

      descTasks.forEach(({ targetIndex, folderName }) => {
        fetchJson(getMarketFileUrl(marketBaseUrl, `${folderName}/datas.json`))
          .then(d => {
            const next = [...itemList.value]
            if (next[targetIndex]) {
              next[targetIndex] = { ...next[targetIndex], description: d.description || '暂无描述' }
              itemList.value = next
            }
          })
          .catch(() => {
            const next = [...itemList.value]
            if (next[targetIndex]) {
              next[targetIndex] = { ...next[targetIndex], description: '暂无描述' }
              itemList.value = next
            }
          })
      })
    })
    .catch(e => {
      console.error('Failed to load market data:', e)
      loading.value = false
    })
})

onUnmounted(() => {
  if (themeObserver) themeObserver.disconnect()
  if (cardsObserver) cardsObserver.disconnect()
  window.removeEventListener('scroll', onScrollOrResize)
  window.removeEventListener('resize', onScrollOrResize)
  if (mouseMoveRaf) cancelAnimationFrame(mouseMoveRaf)
  if (rectUpdateRaf) cancelAnimationFrame(rectUpdateRaf)
})
</script>

<style scoped>
.market-container {
  max-width: 1152px;
  margin: 0 auto;
  padding: 20px 24px;
  width: 100%;
}

.market-header {
  margin-top: 40px;
  margin-bottom: 32px;
}

.market-header h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  border: none;
  padding: 0;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 16px;
  margin: 0;
  line-height: 1.6;
}

.subtitle strong {
  color: var(--vp-c-brand);
  font-weight: 600;
}

/* Controls */
.controls-wrapper {
  margin-bottom: 32px;
}

.search-bar {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vp-c-text-3);
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 42px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  transition: all 0.2s;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
  background: var(--vp-c-bg);
  box-shadow: 0 0 0 2px var(--vp-c-brand-dimm);
}

/* Grid */
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.no-results {
  text-align: center;
  padding: 60px 0;
  color: var(--vp-c-text-2);
}

.no-results h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--vp-c-text-1);
}

.no-results p {
  margin: 0;
  font-size: 14px;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Card */
.plugin-card {
  position: relative;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.plugin-card-surface {
  position: relative;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: inherit;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

/* Spotlight Border Glow */
.plugin-card-surface::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: radial-gradient(
    600px circle at var(--mouse-x) var(--mouse-y),
    var(--vp-c-brand),
    transparent 40%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
  will-change: opacity;
}

.plugin-card.glow-active:not(.hover-active) .plugin-card-surface::before {
  opacity: 1;
}

.plugin-card.hover-active .plugin-card-surface {
  border-color: var(--vp-c-brand);
  box-shadow: 0 12px 24px -10px rgba(0,0,0,0.1);
}

.dark .plugin-card.hover-active .plugin-card-surface {
  box-shadow: 0 12px 24px -10px rgba(0,0,0,0.4);
}

.card-main {
  padding: 20px;
  flex: 1;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
}

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  background: var(--vp-c-bg-alt);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.title-wrapper {
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.plugin-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-author {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.plugin-description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  padding: 12px 20px;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 0 0 12px 12px;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.version-tag {
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--vp-c-brand);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-brand-dimm);
}

.action-btn.copied {
  color: var(--vp-c-green-2, #10b981);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal-content {
  background: var(--vp-c-bg);
  width: 100%;
  max-width: 650px;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modal-title-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

.modal-type-icon {
  font-size: 32px;
  background: var(--vp-c-bg-alt);
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.modal-subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-info-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.description-container h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.modal-description-text {
  font-size: 15px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
}

.included-plugins-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.section-header h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  font-size: 12px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
}

.empty-plugins-msg {
  color: var(--vp-c-text-3);
  font-size: 14px;
  font-style: italic;
  padding: 16px;
  text-align: center;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
}

.included-plugins-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.included-plugin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.included-plugin-item:hover {
  border-color: var(--vp-c-brand);
}

.included-plugin-item.is-clickable {
  cursor: pointer;
}

.included-plugin-item.is-clickable:hover,
.included-plugin-item.is-clickable:focus-visible {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-bg-soft);
  outline: none;
}

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.included-plugin-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.included-plugin-author {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.included-plugin-version {
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  background: var(--vp-c-brand);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
}

.primary-btn:hover {
  background: var(--vp-c-brand-dark);
}

/* Skeleton */
.skeleton-card {
  cursor: default;
  pointer-events: none;
}

.skeleton-card .card-main {
  padding: 20px;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(90deg, var(--vp-c-bg-alt) 25%, var(--vp-c-bg-soft) 50%, var(--vp-c-bg-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 10px;
  flex-shrink: 0;
}

.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, var(--vp-c-bg-alt) 25%, var(--vp-c-bg-soft) 50%, var(--vp-c-bg-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 10px;
}

.skeleton-line.small {
  height: 10px;
  margin-top: 6px;
}

.skeleton-line.w-100 { width: 100%; }
.skeleton-line.w-80 { width: 80%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-40 { width: 40%; }

.skeleton-footer {
  height: 48px;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-divider);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Transition Effects */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
}

/* Responsive */
@media (max-width: 640px) {
  .market-container {
    padding: 20px 16px;
  }

  .plugin-grid {
    grid-template-columns: 1fr;
  }

  .modal-info-bar {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
