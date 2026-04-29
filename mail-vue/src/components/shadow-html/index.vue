<template>
  <div class="content-box" ref="contentBox">
    <div ref="container" class="content-html"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const props = defineProps({
  html: {
    type: String,
    required: true
  },
  renderMode: {
    type: String,
    default: 'allow_basic'
  }
})

const emit = defineEmits(['content-blocked'])

const container = ref(null)
const contentBox = ref(null)
let shadowRoot = null

/**
 * Sanitize HTML content based on the rendering mode.
 * Returns { html, blockedCount } where blockedCount is the number of blocked items.
 */
function sanitizeContent(rawHtml, mode) {
  if (!rawHtml) return { html: '', blockedCount: 0 }

  if (mode === 'allow_all') {
    return { html: rawHtml, blockedCount: 0 }
  }

  if (mode === 'disallow') {
    // Strip ALL HTML, return plain text
    const temp = document.createElement('div')
    temp.innerHTML = rawHtml
    const textContent = temp.textContent || temp.innerText || ''
    return {
      html: `<pre style="font-family: inherit; white-space: pre-wrap; word-break: break-word; margin: 0;">${escapeHtml(textContent)}</pre>`,
      blockedCount: rawHtml !== textContent ? 1 : 0
    }
  }

  // mode === 'allow_basic' (default)
  let blockedCount = 0
  let html = rawHtml

  // Block <script> tags
  const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi)
  if (scriptMatches) {
    blockedCount += scriptMatches.length
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '<!-- blocked script -->')
  }

  // Block external script imports
  const extScriptMatches = html.match(/<script[^>]*src\s*=[^>]*\/?>/gi)
  if (extScriptMatches) {
    blockedCount += extScriptMatches.length
    html = html.replace(/<script[^>]*src\s*=[^>]*\/?>/gi, '<!-- blocked external script -->')
  }

  // Block inline event handlers (onclick, onload, onerror, onmouseover, etc.)
  const eventHandlerRegex = /\s+on\w+\s*=\s*["'][^"']*["']/gi
  const eventMatches = html.match(eventHandlerRegex)
  if (eventMatches) {
    blockedCount += eventMatches.length
    html = html.replace(eventHandlerRegex, ' data-blocked-handler="true"')
  }

  // Block javascript: protocol in href/src/action
  const jsProtocolRegex = /(href|src|action)\s*=\s*["']\s*javascript\s*:[^"']*["']/gi
  const jsMatches = html.match(jsProtocolRegex)
  if (jsMatches) {
    blockedCount += jsMatches.length
    html = html.replace(jsProtocolRegex, '$1="about:blank"')
  }

  // Block <object>, <embed>, <applet>, <form> tags
  const dangerousTags = ['object', 'embed', 'applet', 'form']
  dangerousTags.forEach(tag => {
    const tagRegex = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi')
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/?>`, 'gi')
    const matches1 = html.match(tagRegex)
    const matches2 = html.match(selfClosingRegex)
    if (matches1) {
      blockedCount += matches1.length
      html = html.replace(tagRegex, `<!-- blocked ${tag} -->`)
    }
    if (matches2) {
      blockedCount += matches2.length
      html = html.replace(selfClosingRegex, `<!-- blocked ${tag} -->`)
    }
  })

  // Block tracking pixels (1x1 images and known tracking patterns)
  const trackingPixelRegex = /<img[^>]*(?:width\s*=\s*["']?[01](?:px)?["']?\s+height\s*=\s*["']?[01](?:px)?["']?|height\s*=\s*["']?[01](?:px)?["']?\s+width\s*=\s*["']?[01](?:px)?["']?)[^>]*\/?>/gi
  const trackerMatches = html.match(trackingPixelRegex)
  if (trackerMatches) {
    blockedCount += trackerMatches.length
    html = html.replace(trackingPixelRegex, '<!-- blocked tracker -->')
  }

  // Block <meta http-equiv="refresh">
  const metaRefreshRegex = /<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi
  const metaMatches = html.match(metaRefreshRegex)
  if (metaMatches) {
    blockedCount += metaMatches.length
    html = html.replace(metaRefreshRegex, '<!-- blocked meta refresh -->')
  }

  // Block <iframe> tags
  const iframeRegex = /<iframe[\s\S]*?<\/iframe>|<iframe[^>]*\/?>/gi
  const iframeMatches = html.match(iframeRegex)
  if (iframeMatches) {
    blockedCount += iframeMatches.length
    html = html.replace(iframeRegex, '<!-- blocked iframe -->')
  }

  return { html, blockedCount }
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}

function updateContent() {
  if (!shadowRoot) return;

  const { html: sanitizedHtml, blockedCount } = sanitizeContent(props.html, props.renderMode)

  emit('content-blocked', blockedCount)

  // 1. 提取 <body> 的 style 属性（如果存在）
  const bodyStyleRegex = /<body[^>]*style="([^"]*)"[^>]*>/i;
  const bodyStyleMatch = sanitizedHtml.match(bodyStyleRegex);
  const bodyStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';

  // 2. 移除 <body> 标签（保留内容）
  const cleanedHtml = sanitizedHtml.replace(/<\/?body[^>]*>/gi, '');

  // 3. 将 body 的 style 应用到 .shadow-content
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
        width: 100%;
        height: 100%;
        font-family: -apple-system, Inter, BlinkMacSystemFont,
                    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #13181D;
        word-break: break-word;
      }

      h1, h2, h3, h4 {
          font-size: 18px;
          font-weight: 700;
      }

      p {
        margin: 0;
      }

      a {
        text-decoration: none;
        color: #0E70DF;
      }

      .shadow-content {
        background: #FFFFFF;
        width: fit-content;
        height: fit-content;
        min-width: 100%;
        ${bodyStyle ? bodyStyle : ''} /* 注入 body 的 style */
      }

      img:not(table img) {
        max-width: 100%;
        height: auto !important;
      }

    </style>
    <div class="shadow-content">
      ${cleanedHtml}
    </div>
  `;
}

function autoScale() {
  if (!shadowRoot || !contentBox.value) return

  const parent = contentBox.value
  const shadowContent = shadowRoot.querySelector('.shadow-content')

  if (!shadowContent) return

  const parentWidth = parent.offsetWidth
  const childWidth = shadowContent.scrollWidth

  if (childWidth === 0) return

  const scale = parentWidth / childWidth

  const hostElement = shadowRoot.host
  hostElement.style.zoom = scale
}

onMounted(() => {
  shadowRoot = container.value.attachShadow({ mode: 'open' })
  updateContent()
  autoScale()
})

watch(() => props.html, () => {
  updateContent()
  autoScale()
})

watch(() => props.renderMode, () => {
  updateContent()
  autoScale()
})
</script>

<style scoped>
.content-box {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, Inter, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
}

.content-html {
  width: 100%;
  height: 100%;
}
</style>
