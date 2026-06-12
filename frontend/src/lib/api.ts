export async function parseJsonResponse<T>(res: Response): Promise<{ data: T | null; error: string | null }> {
  const text = await res.text()
  if (!text) {
    return { data: null, error: res.ok ? null : `서버 오류 (${res.status})` }
  }

  try {
    const data = JSON.parse(text) as T
    if (!res.ok) {
      const detail = (data as { detail?: string }).detail
      return { data: null, error: detail || `요청 실패 (${res.status})` }
    }
    return { data, error: null }
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 100)
    return {
      data: null,
      error: res.ok
        ? '서버 응답 형식이 올바르지 않습니다.'
        : `서버 오류 (${res.status}): ${preview}`,
    }
  }
}
