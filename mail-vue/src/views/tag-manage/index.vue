<template>
  <div class="tag-manage-page">
    <div class="tag-header">
      <span class="tag-title">{{ $t('manageTags') }}</span>
      <el-button type="primary" size="small" @click="openCreate">
        <Icon icon="ic:round-add" width="16" height="16" />
        {{ $t('addTag') }}
      </el-button>
    </div>

    <div class="tag-list" v-if="tagStore.tags.length > 0">
      <div class="tag-item" v-for="tag in tagStore.tags" :key="tag.tagId">
        <div class="tag-preview" :style="{ background: tag.color }"></div>
        <span class="tag-label">{{ tag.name }}</span>
        <div class="tag-actions">
          <Icon class="icon-btn" icon="ep:edit" width="16" height="16" @click="openEdit(tag)" v-perm="'tag:set'" />
          <Icon class="icon-btn delete" icon="uiw:delete" width="14" height="14" @click="handleDelete(tag)" v-perm="'tag:delete'" />
        </div>
      </div>
    </div>
    <div class="tag-empty" v-else>
      <el-empty :image-size="100" :description="$t('noTags')" />
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? $t('editTag') : $t('addTag')" width="380px" append-to-body>
      <div class="tag-form">
        <el-input v-model="tagForm.name" :placeholder="$t('tagName')" maxlength="30" />
        <div class="color-row">
          <span>{{ $t('tagColor') }}</span>
          <el-color-picker v-model="tagForm.color" :predefine="presetColors" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('cancel') }}</el-button>
        <el-button type="primary" @click="submitTag" :loading="submitLoading">{{ $t('save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { tagCreate, tagUpdate, tagDelete } from '@/request/tag.js'
import { useTagStore } from '@/store/tag.js'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'tag-manage' })

const { t } = useI18n()
const tagStore = useTagStore()

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const tagForm = reactive({ tagId: null, name: '', color: '#409EFF' })

const presetColors = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
  '#9B59B6', '#1ABC9C', '#3498DB', '#E74C3C', '#2ECC71',
  '#F39C12', '#8E44AD', '#16A085', '#D35400', '#2C3E50'
]

onMounted(() => {
  if (!tagStore.loaded) {
    tagStore.fetchTags()
  }
})

function openCreate() {
  isEdit.value = false
  tagForm.tagId = null
  tagForm.name = ''
  tagForm.color = '#409EFF'
  dialogVisible.value = true
}

function openEdit(tag) {
  isEdit.value = true
  tagForm.tagId = tag.tagId
  tagForm.name = tag.name
  tagForm.color = tag.color
  dialogVisible.value = true
}

async function submitTag() {
  if (!tagForm.name.trim()) {
    ElMessage({ message: t('tagName') + '!', type: 'warning', plain: true })
    return
  }
  submitLoading.value = true
  try {
    if (isEdit.value) {
      const result = await tagUpdate(tagForm.tagId, tagForm.name, tagForm.color)
      tagStore.updateTag(result)
    } else {
      const result = await tagCreate(tagForm.name, tagForm.color)
      tagStore.addTag(result)
    }
    ElMessage({ message: t('tagSaveSuccess'), type: 'success', plain: true })
    dialogVisible.value = false
  } finally {
    submitLoading.value = false
  }
}

function handleDelete(tag) {
  ElMessageBox.confirm(t('tagDelConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(async () => {
    await tagDelete(tag.tagId)
    tagStore.removeTag(tag.tagId)
    ElMessage({ message: t('tagDeleteSuccess'), type: 'success', plain: true })
  })
}
</script>

<style lang="scss" scoped>
.tag-manage-page {
  padding: 15px;
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tag-title {
  font-weight: bold;
  font-size: 16px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  transition: background 0.2s;
}

.tag-item:hover {
  background: var(--el-fill-color);
}

.tag-preview {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.tag-label {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.icon-btn {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: color 0.2s;
}

.icon-btn:hover {
  color: var(--el-color-primary);
}

.icon-btn.delete:hover {
  color: var(--el-color-danger);
}

.tag-empty {
  padding: 20px 0;
}

.tag-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
