<template>
  <div class="tag-view">
    <div class="tag-filter-bar">
      <div class="tag-chips">
        <div
          v-for="t in tagStore.tags" :key="t.tagId"
          class="tag-chip"
          :class="{ active: selectedTagIds.has(t.tagId) }"
          :style="selectedTagIds.has(t.tagId) ? { background: t.color, color: '#fff', borderColor: t.color } : { borderColor: t.color }"
          @click="toggleTag(t.tagId)"
        >
          <div class="chip-dot" v-if="!selectedTagIds.has(t.tagId)" :style="{ background: t.color }"></div>
          <Icon v-else icon="ep:check" width="14" height="14" />
          <span>{{ t.name }}</span>
        </div>
      </div>
    </div>
    <emailScroll
      v-if="selectedTagIds.size > 0"
      ref="scroll"
      type="tag"
      :key="tagKey"
      :cancel-success="cancelStar"
      :getEmailList="getTagEmails"
      :emailDelete="emailDelete"
      :star-add="starAdd"
      :star-cancel="starCancel"
      :show-account-icon="false"
      actionLeft="6px"
      @jump="jumpContent"
    />
    <div class="tag-empty" v-else>
      <el-empty :image-size="120" :description="$t('noTags')" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import emailScroll from '@/components/email-scroll/index.vue'
import { emailDelete } from '@/request/email.js'
import { starAdd, starCancel } from '@/request/star.js'
import { tagEmails } from '@/request/tag.js'
import { useTagStore } from '@/store/tag.js'
import { useEmailStore } from '@/store/email.js'
import router from '@/router/index.js'

defineOptions({ name: 'tag-view' })

const tagStore = useTagStore()
const emailStore = useEmailStore()
const scroll = ref({})
const selectedTagIds = reactive(new Set())
const tagKey = ref(0)

onMounted(() => {
  if (!tagStore.loaded) {
    tagStore.fetchTags()
  }
})

function toggleTag(tagId) {
  if (selectedTagIds.has(tagId)) {
    selectedTagIds.delete(tagId)
  } else {
    selectedTagIds.add(tagId)
  }
  // Force re-mount email scroll to refetch
  tagKey.value++
}

function getTagEmails(emailId, size) {
  const ids = Array.from(selectedTagIds).join(',')
  return tagEmails(ids, emailId, size)
}

function jumpContent(email) {
  emailStore.contentData.email = email
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push('/message')
}

function cancelStar(email) {
  emailStore.cancelStarEmailId = email.emailId
}
</script>

<style lang="scss" scoped>
.tag-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tag-filter-bar {
  padding: 10px 14px;
  box-shadow: var(--header-actions-border);
  overflow-x: auto;
}

.tag-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 14px;
  border: 1.5px solid;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tag-chip:hover {
  opacity: 0.85;
}

.tag-chip.active {
  font-weight: 600;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
