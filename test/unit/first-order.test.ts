import { describe, expect, it } from 'vitest'
import { checkoutSchema, createOrderSchema } from '../../app/utils/checkout-schema'
import {
  buildDemoOrder,
  demoPackagePlans,
  formatTwd,
  goalsClarificationOpen,
  inferClarifyingGoalLabels,
  messageOffersUpload,
  recommendCtaVisible,
  itemsForPackagePlan,
  shipmentStepIds,
  shouldPersistChat,
  snapshotChatMessage,
  stripFinishedQuizGuide,
  timelineStatus
} from '../../app/utils/first-order'

const recipient = {
  name: '林晏婷',
  phone: '0912345678',
  address: '台北市',
  email: 'guest@example.com'
}

describe('first-order demo', () => {
  it('prices one-month basic below advance', () => {
    expect(demoPackagePlans.basic.price).toBe(1280)
    expect(demoPackagePlans.advance.price).toBe(1980)
    expect(demoPackagePlans.basic.durationMonths).toBe(1)
    expect(demoPackagePlans.advance.durationMonths).toBe(1)
    expect(formatTwd(1280)).toBe('NT$1,280')
  })

  it('does not let advance drop core items', () => {
    const coreIds = itemsForPackagePlan('basic').map(item => item.id)
    const fullIds = itemsForPackagePlan('advance').map(item => item.id)
    expect(fullIds).toEqual(expect.arrayContaining(coreIds))
    expect(fullIds.length).toBeGreaterThan(coreIds.length)
  })

  it('only keeps chat when an order is paid', () => {
    expect(shouldPersistChat({ paid: false })).toBe(false)
    expect(shouldPersistChat({ paid: true })).toBe(true)
  })

  it('stores a cloned transcript on the created order', () => {
    const messages = [{
      id: 'm1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: '已上傳報告' }]
    }]
    const order = buildDemoOrder({
      packagePlanCode: 'basic',
      paymentMethod: 'card',
      invoice: 'cloud',
      invoiceCarrier: '/ABC1234',
      recipient,
      messages
    })

    expect(order.messages).toHaveLength(1)
    expect(order.messages[0]).not.toBe(messages[0])
    expect(order.packagePlanCode).toBe('basic')
    expect(order.productCodes).toEqual(['vitaminD', 'iron', 'vitaminC'])
    expect(order.timeline.map(step => step.id)).toEqual(shipmentStepIds)
    expect(timelineStatus(order.timeline)).toBe('confirmed')
    expect(order.amount).toBe(1280)
  })

  it('keeps the momo shipment steps in order', () => {
    expect(shipmentStepIds).toEqual(['confirmed', 'picking', 'shipped', 'delivered'])
  })

  it('treats the latest dated step as the current shipment status', () => {
    expect(timelineStatus([
      { id: 'confirmed', at: '2026-01-01T00:00:00.000Z' },
      { id: 'picking', at: '2026-01-02T00:00:00.000Z' },
      { id: 'shipped', at: null },
      { id: 'delivered', at: null }
    ])).toBe('picking')
  })

  it('exposes both month package plans in the demo catalog', () => {
    expect(Object.keys(demoPackagePlans)).toEqual(['basic', 'advance'])
  })

  it('rejects checkout without a recipient phone', () => {
    const parsed = checkoutSchema.safeParse({
      name: '林晏婷',
      phone: '',
      address: '台北市',
      paymentMethod: 'card',
      invoice: 'cloud',
      invoiceCarrier: '/ABC1234',
      packagePlanCode: 'basic'
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts member invoice with email carrier', () => {
    const parsed = checkoutSchema.safeParse({
      name: '林晏婷',
      phone: '0912345678',
      address: '台北市',
      paymentMethod: 'card',
      invoice: 'member',
      invoiceCarrier: 'guest@example.com',
      packagePlanCode: 'basic'
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts createOrder payload and binds messages', () => {
    const parsed = createOrderSchema.parse({
      packagePlanCode: 'advance',
      paymentMethod: 'linepay',
      invoice: 'donate',
      invoiceCarrier: '12345',
      recipient,
      messages: [{
        id: 'm1',
        role: 'assistant',
        parts: [{ type: 'text', text: '已讀到你的血檢' }]
      }]
    })

    expect(parsed.packagePlanCode).toBe('advance')
    expect(parsed.messages).toHaveLength(1)
  })

  it('persists uploadOffer in journey message snapshots', () => {
    const withOffer = snapshotChatMessage({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: '可上傳報告對照數值' }],
      uploadOffer: true,
      notice: true
    })
    expect(withOffer.uploadOffer).toBe(true)
    expect(withOffer.notice).toBe(true)

    const withoutOffer = snapshotChatMessage({
      id: 'a2',
      role: 'assistant',
      parts: [{ type: 'text', text: '你好' }]
    })
    expect(withoutOffer.uploadOffer).toBeUndefined()
  })

  it('keeps two selected goals open until each is asked and the last question is answered', () => {
    const labels = ['體態管理', '皮膚氣色']
    const askedOne = [
      { role: 'assistant', parts: [{ type: 'text', text: '請選擇改善方向。\n1. 體態管理\n2. 皮膚氣色' }] },
      { role: 'user', parts: [{ type: 'text', text: '體態管理、皮膚氣色' }] },
      { role: 'assistant', parts: [{ type: 'text', text: '已記下體態管理與皮膚氣色。針對體態管理，主要考量是什麼呢？' }] },
      { role: 'user', parts: [{ type: 'text', text: '控制體重' }] }
    ]
    expect(goalsClarificationOpen(askedOne, labels)).toBe(true)

    const secondStillOpen = [
      ...askedOne,
      { role: 'assistant', parts: [{ type: 'text', text: '關於皮膚氣色，您主要想改善的是什麼呢？\n\n問答已完成。若手上有報告可上傳。' }] }
    ]
    expect(goalsClarificationOpen(secondStillOpen, labels)).toBe(true)
    expect(stripFinishedQuizGuide(secondStillOpen[4].parts[0].text)).toBe('關於皮膚氣色，您主要想改善的是什麼呢？')

    const bothAnsweredButFollowUp = [
      ...secondStillOpen,
      { role: 'user', parts: [{ type: 'text', text: '其他' }] },
      { role: 'assistant', parts: [{ type: 'text', text: '針對皮膚氣色，能否說明一下關注點是什麼呢？' }] }
    ]
    expect(goalsClarificationOpen(bothAnsweredButFollowUp, labels)).toBe(true)

    const wrappedUp = [
      ...bothAnsweredButFollowUp,
      { role: 'user', parts: [{ type: 'text', text: '暗沉' }] },
      { role: 'assistant', parts: [{ type: 'text', text: '兩個方向都記下了。' }] }
    ]
    expect(goalsClarificationOpen(wrappedUp, labels)).toBe(false)
    expect(inferClarifyingGoalLabels(wrappedUp, labels.map(label => ({ label })))).toEqual(labels)
  })

  it('shows the recommend button once profile intake is done', () => {
    const base = {
      readonlyMode: false,
      escalated: false,
      goalSelectActive: false,
      profileQuestionActive: false,
      isLatestAssistant: true,
      reportRetry: false
    }
    expect(recommendCtaVisible(base)).toBe(true)
    expect(recommendCtaVisible({ ...base, goalSelectActive: true })).toBe(false)
    expect(recommendCtaVisible({ ...base, profileQuestionActive: true })).toBe(false)
    expect(recommendCtaVisible({ ...base, isLatestAssistant: false })).toBe(false)
    expect(recommendCtaVisible({ ...base, reportRetry: true })).toBe(false)
    expect(recommendCtaVisible({ ...base, pending: true })).toBe(false)
  })

  it('offers upload only when the assistant invites uploading now', () => {
    expect(messageOffersUpload('您目前是否有上傳過健康檢查報告或相關的檢驗數據呢？')).toBe(false)
    expect(messageOffersUpload('是否有血檢或健檢報告？')).toBe(false)
    expect(messageOffersUpload('若方便，可現在上傳報告對照數值。')).toBe(true)
    expect(messageOffersUpload('請先選擇改善方向。')).toBe(false)
  })
})
