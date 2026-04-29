<template>
  <div class="box">
    <div class="header-actions">
      <Icon class="icon" icon="material-symbols-light:arrow-back-ios-new" width="20" height="20" @click="handleBack"/>
      <Icon v-perm="'email:delete'" class="icon" icon="uiw:delete" width="16" height="16" @click="handleDelete"/>
      <span class="star" v-if="emailStore.contentData.showStar">
        <Icon class="icon" @click="changeStar" v-if="email.isStar" icon="fluent-color:star-16" width="20" height="20"/>
        <Icon class="icon" @click="changeStar" v-else icon="solar:star-line-duotone" width="18" height="18"/>
      </span>

      <el-popover
          v-if="emailStore.contentData.showStar && tagStore.tags.length > 0"
          placement="bottom"
          trigger="click"
          width="200"
      >
        <template #reference>
          <Icon class="icon" icon="mdi:tag-outline" width="18" height="18" />
        </template>
        <div class="tag-dropdown">
          <div class="tag-dropdown-title">{{ $t('tags') }}</div>
          <el-scrollbar max-height="250px">
            <div
                v-for="tag in tagStore.tags"
                :key="tag.tagId"
                class="tag-dropdown-item"
                @click="toggleTag(tag)"
            >
              <Icon
                  v-if="hasTag(tag.tagId)"
                  icon="ep:check"
                  width="16"
                  height="16"
                  :color="tag.color"
              />
              <div v-else style="width: 16px; height: 16px;"></div>
              <div class="tag-dropdown-color" :style="{ background: tag.color }"></div>
              <span>{{ tag.name }}</span>
            </div>
          </el-scrollbar>
        </div>
      </el-popover>

      <Icon class="icon" v-if="emailStore.contentData.showReply" v-perm="'email:send'"  @click="openReply" icon="la:reply" width="21" height="21" />
      <Icon class="icon" v-if="emailStore.contentData.showReply" v-perm="'email:send'"  @click="openForward" icon="iconoir:arrow-up-right" width="20" height="20" />
    </div>
    <div></div>
    <el-scrollbar class="scrollbar">
      <div class="container">
        <div class="email-title">
          {{ email.subject }}
        </div>
        <div class="content">
          <div class="email-info">
            <div>
              <div class="send"><span class="send-source">{{$t('from')}}</span>
                <div class="send-name">
                  <span class="send-name-title">{{ email.name }}</span>
                  <span><{{ email.sendEmail }}></span>
                </div>
              </div>
              <div class="receive"><span class="source">{{$t('recipient')}}</span><span class="receive-email">{{  formateReceive(email.recipient) }}</span></div>
              <div class="date">
                <div>{{ formatDetailDate(email.createTime) }}</div>
              </div>

              <!-- Security Section (collapsible) -->
              <div class="security-section" v-if="showSecuritySection && authResults">
                <div class="security-header" @click="securityExpanded = !securityExpanded">
                  <div class="security-header-left">
                    <Icon icon="mdi:shield-check-outline" width="16" height="16" />
                    <span>{{ $t('security') }}</span>
                  </div>
                  <Icon
                    :icon="securityExpanded ? 'ep:arrow-up' : 'ep:arrow-down'"
                    width="14" height="14"
                    class="security-chevron"
                  />
                </div>
                <transition name="security-slide">
                  <div class="security-body" v-show="securityExpanded">
                    <div class="auth-row">
                      <span class="auth-label">{{ $t('spf') }}</span>
                      <el-tag :type="authTagType(authResults.spf?.status)" size="small" effect="plain" round>
                        {{ authStatusLabel(authResults.spf?.status) }}
                      </el-tag>
                      <span class="auth-detail" v-if="authResults.spf?.detail">{{ authResults.spf.detail }}</span>
                    </div>
                    <div class="auth-row">
                      <span class="auth-label">{{ $t('dkim') }}</span>
                      <el-tag :type="authTagType(authResults.dkim?.status)" size="small" effect="plain" round>
                        {{ authStatusLabel(authResults.dkim?.status) }}
                      </el-tag>
                      <span class="auth-detail" v-if="authResults.dkim?.detail">{{ authResults.dkim.detail }}</span>
                    </div>
                    <div class="auth-row">
                      <span class="auth-label">{{ $t('dmarc') }}</span>
                      <el-tag :type="authTagType(authResults.dmarc?.status)" size="small" effect="plain" round>
                        {{ authStatusLabel(authResults.dmarc?.status) }}
                      </el-tag>
                      <span class="auth-detail" v-if="authResults.dmarc?.detail">{{ authResults.dmarc.detail }}</span>
                    </div>
                  </div>
                </transition>
              </div>

            </div>
            <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />

            <!-- Content blocked warning -->
            <el-alert
              v-if="blockedCount > 0"
              :closable="false"
              :title="$t('contentBlocked')"
              :description="$t('contentBlockedDetail', { count: blockedCount })"
              class="email-msg blocked-warning"
              type="warning"
              show-icon
            />
          </div>

          <!-- Render mode selector -->
          <div class="render-mode-bar">
            <div class="render-mode-label">
              <Icon icon="mdi:shield-lock-outline" width="15" height="15" />
              <span>{{ $t('renderMode') }}</span>
            </div>
            <el-segmented
              v-model="currentRenderMode"
              :options="renderModeOptions"
              size="small"
              @change="onRenderModeChange"
            />
          </div>

          <el-scrollbar class="htm-scrollbar" :class="email.attList.length === 0 ? 'bottom-distance' : ''">
            <ShadowHtml
              class="shadow-html"
              :html="formatImage(email.content)"
              :render-mode="currentRenderMode"
              v-if="email.content && currentRenderMode !== 'disallow'"
              @content-blocked="onContentBlocked"
            />
            <pre v-else-if="currentRenderMode === 'disallow' && email.content" class="email-text">{{ stripHtml(email.content) }}</pre>
            <pre v-else class="email-text" >{{email.text}}</pre>
          </el-scrollbar>
          <div class="att" v-if="email.attList.length > 0">
            <div class="att-title">
              <span>{{$t('attachments')}}</span>
              <span>{{$t('attCount',{total: email.attList.length})}}</span>
            </div>
            <div class="att-box">

              <div class="att-item" v-for="att in email.attList" :key="att.attId">
                <div class="att-icon" @click="showImage(att.key)">
                  <Icon v-bind="getIconByName(att.filename)" />
                </div>
                <div class="att-name" @click="showImage(att.key)">
                  {{ att.filename }}
                </div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="opt-icon att-icon">
                  <Icon v-if="isImage(att.filename)" icon="hugeicons:view" width="22" height="22" @click="showImage(att.key)"/>
                  <a :href="cvtR2Url(att.key)" download>
                    <Icon icon="system-uicons:push-down" width="22" height="22"/>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="showPreview = false"
    />
  </div>
</template>
<script setup>
import ShadowHtml from '@/components/shadow-html/index.vue'
import {reactive, ref, watch, onMounted, onUnmounted, computed} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead, emailSetRenderMode} from "@/request/email.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url,toOssDomain} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import {useTagStore} from "@/store/tag.js";
import {tagAddToEmail, tagRemoveFromEmail} from "@/request/tag.js";

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const tagStore = useTagStore();
const router = useRouter()
const email = emailStore.contentData.email
const showPreview = ref(false)
const srcList = reactive([])
const blockedCount = ref(0)
const securityExpanded = ref(false)

const { t } = useI18n()

// Security section visibility (based on system setting, default enabled = 0)
const showSecuritySection = computed(() => {
  return settingStore.settings.securitySection === 0 || settingStore.settings.securitySection === undefined
})

// Parse auth results from email
const authResults = computed(() => {
  try {
    if (email.authResults) {
      return JSON.parse(email.authResults)
    }
  } catch (e) {
    // ignore parse error
  }
  return null
})

// Render mode per email (falls back to global default)
const defaultRenderMode = computed(() => {
  return settingStore.settings.defaultRenderMode || 'allow_basic'
})

const currentRenderMode = ref(
  email.renderMode || defaultRenderMode.value
)

const renderModeOptions = computed(() => [
  { label: t('renderAllowAll'), value: 'allow_all' },
  { label: t('renderAllowBasic'), value: 'allow_basic' },
  { label: t('renderDisallow'), value: 'disallow' },
])

function onRenderModeChange(mode) {
  email.renderMode = mode
  blockedCount.value = 0
  // Persist render mode for this email
  emailSetRenderMode(email.emailId, mode).catch(e => {
    console.error('Failed to save render mode', e)
  })
}

function onContentBlocked(count) {
  blockedCount.value = count
}

function authTagType(status) {
  if (!status) return 'info'
  switch (status) {
    case 'pass': return 'success'
    case 'fail': return 'danger'
    case 'softfail': return 'warning'
    case 'neutral': return 'info'
    case 'none': return 'info'
    default: return 'warning'
  }
}

function authStatusLabel(status) {
  if (!status) return t('authNone')
  const map = {
    pass: t('authPass'),
    fail: t('authFail'),
    softfail: t('authSoftfail'),
    neutral: t('authNeutral'),
    none: t('authNone'),
    temperror: t('authError'),
    permerror: t('authError'),
    bestguesspass: t('authPass'),
    policy: t('authNeutral')
  }
  return map[status] || status
}

function stripHtml(html) {
  if (!html) return ''
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

onMounted(() => {
  if (emailStore.contentData.showUnread && email.unread === EmailUnreadEnum.UNREAD) {
    email.unread = EmailUnreadEnum.READ;
    emailRead([email.emailId]);
  }
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
})

function openReply() {
  uiStore.writerRef.openReply(email)
}

function openForward() {
  uiStore.writerRef.openForward(email)
}

function toMessage(message) {
  return  message ? JSON.parse(message).message : '';
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return  content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function showImage(key) {
  if (!isImage(key)) return;
  const url = cvtR2Url(key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.isStar) {
    email.isStar = 0;
    starCancel(email.emailId).then(() => {
      email.isStar = 0;
      emailStore.cancelStarEmailId = email.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.emailId])
    }).catch((e) => {
      console.error(e)
      email.isStar = 1;
    })
  } else {
    email.isStar = 1;
    starAdd(email.emailId).then(() => {
      email.isStar = 1;
      emailStore.addStarEmailId = email.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email)
    }).catch((e) => {
      console.error(e)
      email.isStar = 0;
    })
  }
}

function hasTag(tagId) {
  return email.tagList && email.tagList.some(t => t.tagId === tagId)
}

async function toggleTag(tag) {
  if (!email.tagList) {
    email.tagList = []
  }

  const index = email.tagList.findIndex(t => t.tagId === tag.tagId)
  try {
    if (index > -1) {
      // Remove tag
      await tagRemoveFromEmail(tag.tagId, email.emailId)
      email.tagList.splice(index, 1)
    } else {
      // Add tag
      await tagAddToEmail(tag.tagId, email.emailId)
      email.tagList.push({ tagId: tag.tagId, name: tag.name, color: tag.color })
    }
  } catch (e) {
    console.error('Failed to toggle tag', e)
  }
}

const handleBack = () => {
  router.back()
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.emailId]
      })
    } else  {

      allEmailDelete(email.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.emailId]
      })
    }

    router.back()
  })
}
</script>
<style scoped lang="scss">
.box {
  height: 100%;
  overflow: hidden;
}

.header-actions {
  padding: 9px 15px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: var(--header-actions-border);
  font-size: 18px;
  .star {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 21px;
  }
  .icon {
    cursor: pointer;
  }
}


.scrollbar {
  height: calc(100% - 38px);
  width: 100%;
}

.tag-dropdown {
  padding: 4px 0;
}
.tag-dropdown-title {
  padding: 0 12px 8px 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: bold;
}
.tag-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}
.tag-dropdown-item:hover {
  background: var(--el-fill-color-light);
}
.tag-dropdown-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.container {
  font-size: 14px;
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 10px;
  @media (max-width: 1023px) {
    padding-left: 15px;
    padding-right: 15px;
  }

  .email-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .htm-scrollbar {
  }

  .content {
    display: flex;
    flex-direction: column;

    .att {
      margin-top: 30px;
      margin-bottom: 30px;
      border: 1px solid var(--light-border-color);
      padding: 14px;
      border-radius: 6px;
      width: fit-content;
      .att-box {
        min-width: min(410px,calc(100vw - 60px));
        max-width: 600px;
        display: grid;
        gap: 12px;
        grid-template-rows: 1fr;
      }

      .att-title {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        span:first-child {
          font-weight: bold;
        }
      }

      .att-item {
        cursor: pointer;
        div {
          align-self: center;
        }
        background: var(--light-ill);
        padding: 5px 7px;
        border-radius: 4px;
        align-self: start;
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        .att-icon {
          display: grid;
        }

        .att-size {
          color: var(--secondary-text-color);
        }

        .att-name {
          margin-left: 8px;
          margin-right: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .att-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .opt-icon {
          padding-left: 10px;
          color: var(--secondary-text-color);
          align-items: center;
          display: flex;
          gap: 8px;
          cursor: pointer;
          a {
            color: var(--secondary-text-color);
            align-items: center;
            display: flex;
          }
        }
      }
    }

    .email-info {

      border-bottom: 1px solid var(--light-border-color);
      margin-bottom: 20px;
      padding-bottom: 8px;
      @media (max-width: 1024px) {
        margin-bottom: 15px;
      }
      .date {
        color: var(--regular-text-color);
        margin-bottom: 6px;
      }

      .email-msg {
        max-width: 400px;
        width: fit-content;
        margin-bottom: 15px;
      }

      .blocked-warning {
        max-width: 500px;
      }

      .send {
        display: flex;
        margin-bottom: 6px;

        .send-name {
          color: var(--regular-text-color);
          display: flex;
          flex-wrap: wrap;
        }

        .send-name-title {
          padding-right: 5px;
        }
      }

      .receive {
        margin-bottom: 6px;
        display: flex;
        .receive-email {
          max-width: 700px;
          word-break: break-word;
        }
        span:nth-child(2) {
          color: var(--regular-text-color);
        }
      }

      .send-source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }

      .source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }
    }
  }
}

/* Security Section Styles */
.security-section {
  margin-top: 8px;
  margin-bottom: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  border-radius: 6px;
  overflow: hidden;
  max-width: 500px;
}

.security-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  cursor: pointer;
  background: var(--el-fill-color-lighter, #fafafa);
  transition: background 0.2s;
  user-select: none;

  &:hover {
    background: var(--el-fill-color, #f0f2f5);
  }
}

.security-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.security-chevron {
  color: var(--el-text-color-secondary);
  transition: transform 0.2s;
}

.security-body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.auth-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.auth-label {
  font-weight: 600;
  min-width: 48px;
  color: var(--el-text-color-primary);
}

.auth-detail {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.security-slide-enter-active,
.security-slide-leave-active {
  transition: all 0.2s ease;
  max-height: 200px;
  overflow: hidden;
}
.security-slide-enter-from,
.security-slide-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}

/* Render mode bar */
.render-mode-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  margin-bottom: 10px;
  gap: 12px;
  flex-wrap: wrap;
}

.render-mode-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.shadow-html::after  {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--message-block-color); /* 半透明黑色蒙层 */
  pointer-events: none; /* 不影响点击 */
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.bottom-distance {
  margin-bottom: 30px;
}


</style>
