import http from "@/axios/index.js";

export function tagCreate(name, color) {
    return http.post('/tag/create', { name, color })
}

export function tagUpdate(tagId, name, color) {
    return http.put('/tag/update', { tagId, name, color })
}

export function tagDelete(tagId) {
    return http.delete('/tag/delete', { params: { tagId } })
}

export function tagList() {
    return http.get('/tag/list')
}

export function tagAddToEmail(tagId, emailId) {
    return http.post('/tag/addToEmail', { tagId, emailId })
}

export function tagRemoveFromEmail(tagId, emailId) {
    return http.delete('/tag/removeFromEmail', { params: { tagId, emailId } })
}

// tagIds: comma-separated string of tag IDs for multi-tag filtering
export function tagEmails(tagIds, emailId, size) {
    return http.get('/tag/emails', { params: { tagIds, emailId, size } })
}
