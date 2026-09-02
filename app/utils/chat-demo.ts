import type { PlanId } from '~/utils/plans'

export type ChatLocale = 'zh-TW' | 'en'

const replies = {
  'zh-TW': {
    hasReport: '已有報告的話，一般「報告解讀」或高級「個人化選品」都適合。付款成功後才能預約，名單會轉到顧問端。你比較想先聽報告，還是連選品一起處理？',
    noReport: '還沒有報告的話，中階會先安排採檢，高級則是採檢後再做選品。AI 只幫你釐清路徑，不會指定商品。你比較在意疲勞、代謝，還是想做一次比較完整的檢測？',
    plans: '一般適合手上已有紙本血檢、只要一次真人解讀。中階給還沒驗血的人，先安排採檢再解讀。高級包含諮詢與選品出貨。有報告可走一般或高級；沒報告可走中階或高級。',
    next: '對談釐清方案後，付款才解鎖顧問。預約名單會轉過去，諮詢在顧問系統進行，這個 App 看不到內容。準備好了可以按「專人客服」。',
    fallback: '了解。你可以告訴我有沒有血檢報告，或你最想先處理的狀況。需要真人接手時，按「專人客服」即可。'
  },
  'en': {
    hasReport: 'If you already have a report, Basic reading or Premium selection both fit. Payment unlocks booking, then your name is passed to the advisor. Do you want a reading first, or products as well?',
    noReport: 'Without a report, Mid arranges collection first; Premium adds product selection after. AI only clarifies the path and will not prescribe products. Is fatigue, metabolism, or a fuller panel the priority?',
    plans: 'Basic is a one-time live reading if you already have paper labs. Mid is for people who still need a blood test. Premium includes consult plus keyed-in shipment. With a report: Basic or Premium. Without: Mid or Premium.',
    next: 'After chat clarifies a plan, payment unlocks the advisor. Booking passes your name over; the consult is not shown in this app. When you are ready, tap Talk to a specialist.',
    fallback: 'Got it. Tell me whether you have a blood report, or what you want to tackle first. When you want a person, tap Talk to a specialist.'
  }
} as const

export function demoAssistantReply(input: {
  question: string
  locale?: string
  plan?: PlanId
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

  if (/(方案|差在|basic|mid|premium|plan)/i.test(text)) {
    return pack.plans
  }

  if (/(接下來|怎麼走|next|happen)/i.test(text)) {
    return pack.next
  }

  if (input.plan === 'basic') {
    return pack.hasReport
  }

  if (input.plan === 'mid') {
    return pack.noReport
  }

  return pack.fallback
}
