import { describe, expect, it } from 'vitest'
import {
  canShowRefundRequest,
  orderHasExpertPlanLine,
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

  it('blocks refund during picking even when core allows', () => {
    expect(canShowRefundRequest({
      canRequestRefund: true,
      refundRequestStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true,
      shipmentStatus: 'picking',
      expertCasePhase: 'reviewed'
    })).toBe(false)

    expect(refundRequestUi({
      canRequestRefund: true,
      refundRequestStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true,
      shipmentStatus: 'picking',
      expertCasePhase: 'reviewed'
    }).blockReason).toBe('picking')
  })

  it('requires reviewed phase before refund is enabled', () => {
    expect(canShowRefundRequest({
      canRequestRefund: true,
      refundRequestStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true,
      shipmentStatus: 'pending',
      expertCasePhase: 'awaiting_review'
    })).toBe(false)

    expect(canShowRefundRequest({
      canRequestRefund: true,
      refundRequestStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true,
      shipmentStatus: 'pending',
      expertCasePhase: 'reviewed'
    })).toBe(true)
  })

  it('shows 申請退款 only when gates pass; rejected never again', () => {
    expect(canShowRefundRequest({
      canRequestRefund: true,
      refundRequestStatus: 'rejected',
      paymentStatus: 'paid',
      hasExpertPlanLine: true
    })).toBe(false)

    expect(canShowRefundRequest({
      refundRequestStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true,
      shipmentStatus: 'shipped',
      expertCasePhase: 'reviewed'
    })).toBe(false)

    expect(canShowRefundRequest({
      canRequestRefund: false,
      refundRequestStatus: null,
      paymentStatus: 'paid',
      hasExpertPlanLine: true,
      expertCasePhase: 'reviewed'
    })).toBe(false)
  })

  it('uses core refund_request_display for requested', () => {
    expect(refundRequestDisplayText({
      status: 'requested',
      display: '退款申請中'
    })).toBe('退款申請中')
    expect(refundRequestDisplayText({ status: 'rejected', display: null })).toBe(null)
  })
})
