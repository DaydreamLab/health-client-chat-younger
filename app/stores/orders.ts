import type { OrderRecord } from '~/utils/first-order'

const STORAGE_KEY = 'candor-paid-orders'

function readStoredOrders(): OrderRecord[] {
  if (!import.meta.client) {
    return []
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as OrderRecord[] : []
  } catch {
    return []
  }
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<OrderRecord[]>(readStoredOrders())

  function persist() {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.value))
  }

  function hydrate() {
    orders.value = readStoredOrders()
  }

  function add(order: OrderRecord) {
    orders.value = [order, ...orders.value.filter(item => item.id !== order.id)]
    persist()
  }

  function list() {
    return orders.value
  }

  function getById(id: string) {
    return orders.value.find(item => item.id === id)
  }

  return {
    orders,
    hydrate,
    add,
    list,
    getById
  }
})
