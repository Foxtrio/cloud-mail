import { defineStore } from 'pinia'
import { tagList } from '@/request/tag.js'

export const useTagStore = defineStore('tag', {
    state: () => ({
        tags: [],
        loaded: false,
    }),
    actions: {
        async fetchTags() {
            try {
                this.tags = await tagList()
                this.loaded = true
            } catch (e) {
                console.error('Failed to fetch tags', e)
            }
        },
        getTagById(tagId) {
            return this.tags.find(t => t.tagId === tagId)
        },
        addTag(tag) {
            this.tags.unshift(tag)
        },
        updateTag(tag) {
            const index = this.tags.findIndex(t => t.tagId === tag.tagId)
            if (index > -1) {
                this.tags[index] = tag
            }
        },
        removeTag(tagId) {
            this.tags = this.tags.filter(t => t.tagId !== tagId)
        }
    }
})
