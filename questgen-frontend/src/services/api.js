import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'),
  withCredentials: false,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isNetwork = !err?.response
    const msg = isNetwork
      ? `Backend unreachable at ${api.defaults.baseURL}. Start the Flask server (expected http://localhost:5000).`
      : (err?.response?.data?.error || err?.response?.data?.errors?.join?.(', ') || err.message)
    console.error('API error:', msg)
    return Promise.reject(new Error(msg))
  }
)

export default api

// Endpoints
export const SchemesAPI = {
  list: () => api.get('/schemes').then(r => r.data),
  create: (payload) => api.post('/schemes', payload).then(r => r.data),
}

export const SubjectsAPI = {
  list: (scheme_id) => api.get('/subjects', { params: { scheme_id } }).then(r => r.data),
  create: (payload) => api.post('/subjects', payload).then(r => r.data),
}

export const QuestionBanksAPI = {
  list: (scheme_id, subject_id) => api.get('/question-banks', { params: { scheme_id, subject_id } }).then(r => r.data),
  upload: (formData) => api.post('/upload-question-bank', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  file: (id) => api.get(`/question-banks/${id}/file`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/question-banks/${id}`).then(r => r.data),
}

export const NotesAPI = {
  syllabus: {
    list: (scheme_id, subject_id) => api.get('/subject-syllabus', { params: { scheme_id, subject_id } }).then(r => r.data),
    upload: (formData) => api.post('/subject-syllabus', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    file: (id) => api.get(`/subject-syllabus/${id}/file`, { responseType: 'blob' }),
    delete: (id) => api.delete(`/subject-syllabus/${id}`).then(r => r.data),
  },
  modules: {
    list: (scheme_id, subject_id) => api.get('/module-notes', { params: { scheme_id, subject_id } }).then(r => r.data),
    upload: (formData) => api.post('/module-notes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    file: (id, download=0) => api.get(`/module-notes/${id}/file`, { params: { download }, responseType: 'blob' }),
    delete: (id) => api.delete(`/module-notes/${id}`).then(r => r.data),
  }
}

export const QuestionsAPI = {
  list: (params) => api.get('/questions', { params }).then(r => r.data),
  update: (id, payload) => api.patch(`/questions/${id}`, payload).then(r => r.data),
}

export const PaperAPI = {
  generate: (payload) => api.post('/generate-paper', payload).then(r => r.data),
  draft: (id) => api.get(`/paper-drafts/${id}`).then(r => r.data),
  save: (id, payload) => api.put(`/paper-drafts/${id}`, payload).then(r => r.data),
  exportHtml: (id, payload) => api.post(`/paper-drafts/${id}/export`, payload, { responseType: 'blob' }),
}

export const ScheduleAPI = {
  create: (payload) => api.post('/schedule', payload).then(r => r.data),
  byTeacher: (teacher_id, params) => api.get(`/schedule/teacher/${teacher_id}`, { params }).then(r => r.data),
  byStudent: (student_id, params) => api.get(`/schedule/student/${student_id}`, { params }).then(r => r.data),
  update: (id, payload) => api.patch(`/schedule/${id}`, payload).then(r => r.data),
  delete: (id) => api.delete(`/schedule/${id}`).then(r => r.data),
}

export const TasksAPI = {
  list: (student_id, params) => api.get('/student-tasks', { params: { student_id, ...params } }).then(r => r.data),
  create: (payload) => api.post('/student-tasks', payload).then(r => r.data),
  update: (id, payload) => api.patch(`/student-tasks/${id}`, payload).then(r => r.data),
  delete: (id) => api.delete(`/student-tasks/${id}`).then(r => r.data),
}

export const UsersAPI = {
  register: (payload) => api.post('/register', payload).then(r => r.data),
  byFirebaseUid: (uid) => api.get(`/users/${uid}`).then(r => r.data),
  update: (uid, payload) => api.put(`/users/${uid}`, payload).then(r => r.data),
}

// Optional simple notes API; backend may not implement these. Frontend will fall back to localStorage if calls fail.
export const SimpleNotesAPI = {
  list: (user_id) => api.get('/notes', { params: { user_id } }).then(r => r.data),
  create: (payload) => api.post('/notes', payload).then(r => r.data),
  update: (id, payload) => api.put(`/notes/${id}`, payload).then(r => r.data),
  delete: (id) => api.delete(`/notes/${id}`).then(r => r.data),
}
