export interface LeetCodeProblemMetadata {
  title: string
  slug: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  leetcode_number: number
}

// Memory cache for the server instance
let cachedProblems: Record<string, LeetCodeProblemMetadata> | null = null

export function normalizeTitle(title: string): string {
  // Remove starting numbers like "231. " or "1 "
  const stripped = title.replace(/^\d+[\.\s]+/, '')
  // Remove all non-alphanumeric characters and lowercase
  return stripped.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

export async function fetchLeetcodeDictionary(): Promise<Record<string, LeetCodeProblemMetadata>> {
  if (cachedProblems) return cachedProblems

  try {
    const res = await fetch('https://leetcode.com/api/problems/all/', {
      next: { revalidate: 86400 } // cache for 24h
    })
    
    if (!res.ok) throw new Error('Failed to fetch leetcode api')
    
    const data = await res.json()
    const map: Record<string, LeetCodeProblemMetadata> = {}

    for (const item of data.stat_status_pairs) {
      const stat = item.stat
      const diff = item.difficulty.level
      const difficulty = diff === 1 ? 'Easy' : diff === 2 ? 'Medium' : 'Hard'

      const metadata: LeetCodeProblemMetadata = {
        title: stat.question__title,
        slug: stat.question__title_slug,
        difficulty,
        leetcode_number: stat.frontend_question_id
      }

      // Add to map by normalized title
      const normalized = normalizeTitle(stat.question__title)
      map[normalized] = metadata
    }

    cachedProblems = map
    return map
  } catch (error) {
    console.error('LeetCode API fetch error:', error)
    return {}
  }
}

export async function resolveLeetCodeData(title: string): Promise<LeetCodeProblemMetadata | null> {
  const dict = await fetchLeetcodeDictionary()
  const normalized = normalizeTitle(title)
  return dict[normalized] || null
}
