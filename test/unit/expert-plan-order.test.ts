import { describe, expect, it } from 'vitest'
import {
  canShowRefundRequest,
  isExpertProcessing,
  orderHasExpertPlanLine,
  orderRefundStatus,
  orderShipmentStatus,
  refundRequestDisplayText,
  refundRequestUi
} from '../../app/utils/expert-plan-order'

describe('expert-plan-order helpers', () => {
  it('detects expert_plan lines', () => {
    expect(orderHasExpertPlanLine({
      lines: [{ kind: 'package' }, { kind: 'expert_plan', expert_plan_code: 'basic' }]
    })).toBe(true)
    expect(orderHasExpertPlanLine({ lines: [{ kind: 'package' }] })).toBe(false)
  })

  it('reads shipment status from flat or nested fields', () => {
    expect(orderShipmentStatus({ shipment_status: 'picking' })).toBe('picking')
    expect(orderShipmentStatus({ shipment: { status: 'shipped' } })).toBe('shipped')
    expect(orderShipmentStatus({})).toBe(null)
  })

  it('prefers refund_status over refund_request_status', () => {
    expect(orderRefundStatus({
      refund_status: 'requested',
      refund_request_status: 'rejected'
    })).toBe('requested')
  })

  it('uses core refund_blocked_reason for disabled button', () => {
    expect(refundRequestUi({
      refundBlockedReason: 'picking_started',
      paymentStatus: 'paid',
      hasExpertPlanLine: true
    })).toMatchObject({
      showButton: true,
      enabled: false,
      blockReason: 'picking_started'
    })
  })

  it('hides button for refund_request_exists and refund_rejected', () => {
    expect(refundRequestUi({
      refundBlockedReason: 'refund_request_exists',
      paymentStatus: 'paid',
      hasExpertPlanLine: true
    }).showButton).toBe(false)

    expect(refundRequestUi({
      refundBlockedReason: 'refund_rejected',
      paymentStatus: 'paid',
      hasExpertPlanLine: true
    }).showButton).toBe(false)
  })

  it('enables when refund_blocked_reason is null and no terminal status', () => {
    expect(canShowRefundRequest({
      refundBlockedReason: null,
      refundStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true
    })).toBe(true)
  })

  it('uses core refund_request_display for requested', () => {
    expect(refundRequestDisplayText({
      status: 'requested',
      display: '退款申請中'
    })).toBe('退款申請中')
    expect(refundRequestDisplayText({ status: 'rejected', display: null })).toBe(null)
  })

  it('isExpertProcessing when phase processing or awaiting_review while paid', () => {
    expect(isExpertProcessing({
      hasExpertPlanLine: true,
      paymentStatus: 'paid',
      expertCasePhase: 'processing',
      expertCaseStatus: null
    })).toBe(true)

    expect(isExpertProcessing({
      hasExpertPlanLine: true,
      paymentStatus: 'paid',
      expertCasePhase: null,
      expertCaseStatus: 'awaiting_review'
    })).toBe(true)

    expect(isExpertProcessing({
      hasExpertPlanLine: true,
      paymentStatus: 'paid',
      expertCasePhase: 'finalized',
      expertCaseStatus: 'reviewed'
    })).toBe(false)
  })
})
