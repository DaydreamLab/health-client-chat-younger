import { describe, expect, it } from 'vitest'
import { checkoutSchema, createOrderSchema } from '../../app/utils/checkout-schema'
import type { OrderDetail, OrderSummary } from '../../app/utils/candor-api'
import {
  buildDemoOrder,
  demoPackagePlans,
  expertPlanNameFromDetail,
  expertPlanNameFromSummary,
  formatTwd,
  goalsClarificationOpen,
  inferClarifyingGoalLabels,
  itemsForPackagePlan,
  omitItemsMatchingPlanName,
  orderRecordFromCandorDetail,
  orderRecordFromCandorSummary,
  resolveOrderPlanName,
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

  it('persists checkupOffer in journey message snapshots', () => {
    const withOffer = snapshotChatMessage({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: '如果去做一次檢查，之後可以更清楚各項指標。' }],
      checkupOffer: true
    })
    expect(withOffer.checkupOffer).toBe(true)

    const withoutOffer = snapshotChatMessage({
      id: 'a2',
      role: 'assistant',
      parts: [{ type: 'text', text: '你好' }]
    })
    expect(withoutOffer.checkupOffer).toBeUndefined()
  })

  it('persists replyActions in journey message snapshots', () => {
    const original = {
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'llm' as const,
      degraded: false,
      actions: [{ type: 'ask_report', payload: { x: 1 } }]
    }
    const cloned = snapshotChatMessage({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: '可上傳報告' }],
      replyActions: original
    })
    expect(cloned.replyActions?.actions[0]?.type).toBe('ask_report')
    expect(cloned.replyActions).not.toBe(original)
    expect(cloned.replyActions?.actions[0]).not.toBe(original.actions[0])
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
})

describe('order plan display name', () => {
  it('prefers expert_plan_name over package_plan_name when hasExpertPlanLine', () => {
    expect(resolveOrderPlanName({
      hasExpertPlanLine: true,
      expertPlanName: '專家方案（基礎保養）',
      packagePlanName: '基礎保養'
    })).toBe('專家方案（基礎保養）')
    expect(resolveOrderPlanName({
      hasExpertPlanLine: true,
      expertPlanName: null,
      packagePlanName: '基礎保養'
    })).toBeUndefined()
    expect(resolveOrderPlanName({
      hasExpertPlanLine: false,
      expertPlanName: '專家方案（基礎保養）',
      packagePlanName: '基礎保養'
    })).toBe('基礎保養')
  })

  it('keeps the full expert plan name without stripping the prefix', () => {
    const detail: OrderDetail = {
      id: 'o1',
      order_no: 'ORD-1',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 6000,
      package_plan_name: '基礎保養',
      lines: [{
        kind: 'expert_plan',
        expert_plan_code: 'basic',
        expert_plan_name: '專家方案（基礎保養）'
      }]
    }
    expect(expertPlanNameFromDetail(detail)).toBe('專家方案（基礎保養）')
    const order = orderRecordFromCandorDetail(detail)
    expect(order.hasExpertPlanLine).toBe(true)
    expect(order.packageName).toBe('專家方案（基礎保養）')
  })

  it('drops the duplicate expert plan item row before finalize', () => {
    const detail: OrderDetail = {
      id: 'o2',
      order_no: 'ORD-2',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 6000,
      package_plan_name: null,
      package: null,
      lines: [{
        kind: 'expert_plan',
        expert_plan_code: 'basic',
        expert_plan_name: '專家方案（基礎保養）'
      }],
      expert_case_phase: 'processing'
    }
    const order = orderRecordFromCandorDetail(detail, {
      productCodes: ['expert_plan'],
      productNames: ['專家方案（基礎保養）']
    })
    expect(order.packageName).toBe('專家方案（基礎保養）')
    expect(order.items).toEqual([])
    expect(omitItemsMatchingPlanName(
      [{ code: 'expert_plan', name: '專家方案（基礎保養）', dailyDose: 1 }],
      '專家方案（基礎保養）'
    )).toEqual([])
  })

  it('keeps component items after expert finalize and still uses expert name', () => {
    const detail: OrderDetail = {
      id: 'o3',
      order_no: 'ORD-3',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 6000,
      package_plan_name: '基礎保養',
      package: {
        id: 'pkg-1',
        package_plan_code: 'basic',
        package_plan_name: '基礎保養',
        package_plan_price: 4500,
        period_days: 30,
        composition_hash: 'sha256:x',
        used_amount: 6000,
        remaining: 0,
        components: [{
          id: 'c1',
          sellable_item_id: 's1',
          sellable_item_code: 'vitamin_d',
          sellable_item_name: '維生素 D',
          unit_price: 9,
          daily_dose: 1,
          monthly_cost: 280,
          rank: 1
        }]
      },
      lines: [{
        kind: 'expert_plan',
        expert_plan_code: 'basic',
        expert_plan_name: '專家方案（基礎保養）'
      }],
      expert_case_phase: 'finalized'
    }
    const order = orderRecordFromCandorDetail(detail)
    expect(order.packageName).toBe('專家方案（基礎保養）')
    expect(order.items).toHaveLength(1)
    expect(order.items[0]?.name).toBe('維生素 D')
  })

  it('maps package_amount／addon_amount／bottle_addons from OrderDetail', () => {
    const detail: OrderDetail = {
      id: 'o-addon',
      order_no: 'ORD-ADDON',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 2870,
      package_amount: 1980,
      addon_amount: 890,
      package_plan_name: '基礎保養',
      package: {
        id: 'pkg-1',
        package_plan_code: 'basic',
        package_plan_name: '基礎保養',
        package_plan_price: 1980,
        period_days: 30,
        composition_hash: 'sha256:x',
        used_amount: 800,
        remaining: 1180,
        components: [{
          id: 'c1',
          sellable_item_id: 's1',
          sellable_item_code: 'vitamin_d',
          sellable_item_name: '維生素 D',
          unit_price: 9,
          daily_dose: 1,
          monthly_cost: 280,
          rank: 1
        }]
      },
      lines: [
        { kind: 'package', package_plan_code: 'basic' },
        {
          kind: 'bottle_addon',
          sellable_item_code: 'omega3',
          sellable_item_name: 'Omega-3',
          qty: 1,
          bottle_price: 890,
          amount: 890
        }
      ],
      bottle_addons: [{
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        qty: 1,
        bottle_price: 890,
        amount: 890
      }]
    }
    const order = orderRecordFromCandorDetail(detail)
    expect(order.amount).toBe(2870)
    expect(order.packageAmount).toBe(1980)
    expect(order.addonSubtotal).toBe(890)
    expect(order.bottleAddons).toEqual([{
      code: 'omega3',
      name: 'Omega-3',
      qty: 1,
      bottlePrice: 890,
      lineTotal: 890
    }])
  })

  it('maps list summary with top-level expert_plan_name and falls back safely', () => {
    const withTop: OrderSummary = {
      id: 's1',
      order_no: 'ORD-S1',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 6000,
      package_plan_name: '基礎保養',
      expert_plan_name: '專家方案（基礎保養）',
      created_at: '2026-11-04T00:00:00Z'
    }
    expect(expertPlanNameFromSummary(withTop)).toBe('專家方案（基礎保養）')
    expect(orderRecordFromCandorSummary(withTop).packageName).toBe('專家方案（基礎保養）')
    expect(orderRecordFromCandorSummary(withTop).hasExpertPlanLine).toBe(true)

    const fromLines: OrderSummary = {
      id: 's2',
      order_no: 'ORD-S2',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 6000,
      package_plan_name: '基礎保養',
      lines: [{ kind: 'expert_plan', expert_plan_name: '專家方案（完整調理）' }],
      created_at: '2026-11-04T00:00:00Z'
    }
    expect(orderRecordFromCandorSummary(fromLines).packageName).toBe('專家方案（完整調理）')

    const aiOnly: OrderSummary = {
      id: 's3',
      order_no: 'ORD-S3',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 4500,
      package_plan_name: '基礎保養',
      created_at: '2026-11-04T00:00:00Z'
    }
    expect(orderRecordFromCandorSummary(aiOnly).packageName).toBe('基礎保養')
    expect(orderRecordFromCandorSummary(aiOnly).hasExpertPlanLine).toBe(false)

    const legacy: OrderSummary = {
      id: 's4',
      order_no: 'ORD-S4',
      status: 'confirmed',
      payment_status: 'paid',
      amount_total: 1280,
      created_at: '2026-11-04T00:00:00Z'
    }
    expect(orderRecordFromCandorSummary(legacy).packageName).toBeUndefined()
  })
})
