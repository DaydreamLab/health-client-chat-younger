import { mockReportAnalysis } from '../../app/utils/first-order'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    locale?: string
    fileName?: string
  }>(event)

  return mockReportAnalysis(body.locale)
})
