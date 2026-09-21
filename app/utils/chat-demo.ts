import type { PlanId } from '~/utils/plans'
import type { SupplementPlanId } from '~/utils/first-order'

export type ChatLocale = 'zh-TW' | 'en'

const replies = {
  'zh-TW': {
    hasReport: '已有報告的話，先上傳血檢。看完圖表後可以選一個月的基礎保養或完整調理。',
    noReport: '還沒有報告也可以先對談。之後上傳血檢，再選基礎保養或完整調理。',
    plans: '基礎保養是對應異常指標的一個月基礎補充。完整調理在基礎保養之外加上加強項目。先對談、上傳血檢，確認後再付款。',
    next: '對談釐清方案後，付款才解鎖顧問。預約名單會轉過去，諮詢在顧問系統進行，這個 App 看不到內容。準備好了可以按「專人客服」。',
    upload: '已讀到你的血檢。維他命 D 與鐵蛋白偏低，HOMA-IR 略高。可以看圖表，並選擇一個月的基礎保養或完整調理。',
    fallback: '了解。你可以告訴我有沒有血檢報告，或你最想先處理的狀況。需要真人接手時，按「專人客服」即可。'
  },
  'en': {
    hasReport: 'If you already have a report, upload it first. After the chart you can pick a one-month plan — Basic Care or Full Tune.',
    noReport: 'You can still chat without a report. Upload labs later, then pick Basic Care or Full Tune.',
    plans: 'Basic Care is a one-month core fill for the markers that are off. Full Tune adds extras on top of Basic Care. Chat, upload labs, then pay to confirm.',
    next: 'After chat clarifies a plan, payment unlocks the advisor. Booking passes your name over; the consult is not shown in this app. When you are ready, tap Talk to a specialist.',
    upload: 'I read your labs. Vitamin D and ferritin are low; HOMA-IR is a bit high. Open the chart and pick a one-month plan — Basic Care or Full Tune.',
    fallback: 'Got it. Tell me whether you have a blood report, or what you want to tackle first. When you want a person, tap Talk to a specialist.'
  }
} as const

export function demoAssistantReply(input: {
  question: string
  locale?: string
  plan?: PlanId | SupplementPlanId
}): string {
  const locale: ChatLocale = input.locale === 'en' ? 'en' : 'zh-TW'
  const text = input.question.toLowerCase()
  const pack = replies[locale]

  if (/(已有|有報告|have a (blood )?report|already have)/i.test(text) && !/(沒有|還沒|don't|dont|no report)/i.test(text)) {
    return pack.hasReport
  }

  if (/(沒有報告|還沒|採檢|no report|don't have|collection|testing)/i.test(text)) {
    return pack.noReport
  }

  if (/(方案|差在|basic|mid|premium|plan|保養|調理)/i.test(text)) {
    return pack.plans
  }

  if (/(接下來|怎麼走|next|happen)/i.test(text)) {
    return pack.next
  }

  if (/(上傳|血檢報告檔|upload|photo of (my )?report)/i.test(text)) {
    return pack.upload
  }

  if (input.plan === 'basic' || input.plan === 'basicCare') {
    return pack.hasReport
  }

  if (input.plan === 'mid') {
    return pack.noReport
  }

  return pack.fallback
}
