import type {
  CartItem,
  CheckoutCustomerInput,
  EscrowHoldRecord,
  NovaPoshtaTrackingStatus,
  ParentOrder,
  SettlementBatchRecord,
  VendorChildOrder,
} from "@life/types";

const ORDERS_STORAGE_KEY = "life_mp_orders_v1";
const PLATFORM_COMMISSION_RATE = 0.1; // 10% platform commission per Phase 4B agreement

export const NOVA_POSHTA_STATUS_MAP: Record<NovaPoshtaTrackingStatus, string> =
  {
    1: "Створено ЕН у кабінеті майстерні",
    4: "Посилка прямує до отримувача",
    5: "Посилка прямує до отримувача",
    7: "Прибуло у відділення",
    8: "Прибуло у поштомат",
    9: "Посилку отримано та оплачено (Вручено)",
    102: "Відмова від отримання",
    103: "Повернення відправнику",
  };

interface StoredOrderState {
  parentOrders: ParentOrder[];
  childOrders: VendorChildOrder[];
  escrowHolds: EscrowHoldRecord[];
  settlements: SettlementBatchRecord[];
}

let inMemoryOrderState: StoredOrderState | null = null;

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LF-${dateStr}-${randomSuffix}`;
}

function generateTrackingNumber(): string {
  const prefix = "DEMO-NP-";
  const randomBody = Math.floor(1000000000 + Math.random() * 9000000000);
  return `${prefix}${randomBody}`;
}

function getInitialStoredState(): StoredOrderState {
  return {
    parentOrders: [
      {
        id: "ord_demo_parent_1",
        orderNumber: "LF-20260819-1001",
        customer: {
          fullName: "Демо Покупець",
          phone: "+380 00 000 00 00",
          email: "demo-buyer@example.internal",
          city: "Київ",
          novaPoshtaBranch: "Відділення №42 (вул. Саксаганського, 102)",
          paymentMethod: "sandbox_escrow",
          comment: "Дбайливе пакування для глиняного посуду",
        },
        items: [
          {
            id: "prod_1",
            slug: "chashka-ranok",
            name: "Чашка «Ранок»",
            categorySlug: "dim",
            priceUah: 420,
            quantity: 2,
            vendorHandle: "olena",
            vendorName: "Майстерня Олени",
          },
          {
            id: "prod_2",
            slug: "shoper-razom",
            name: "Шопер «Разом»",
            categorySlug: "odiah",
            priceUah: 390,
            quantity: 1,
            vendorHandle: "berehynia",
            vendorName: "Ткацтво Берегиня",
          },
        ],
        totalAmountUah: 1230,
        status: "escrow_held",
        childOrderIds: ["child_ord_101", "child_ord_102"],
        escrowHoldId: "escrow_demo_1",
        createdAt: "2026-08-19T10:00:00.000Z",
      },
    ],
    childOrders: [
      {
        id: "child_ord_101",
        parentOrderId: "ord_demo_parent_1",
        parentOrderNumber: "LF-20260819-1001",
        vendorHandle: "olena",
        vendorName: "Майстерня Олени",
        items: [
          {
            id: "prod_1",
            slug: "chashka-ranok",
            name: "Чашка «Ранок»",
            categorySlug: "dim",
            priceUah: 420,
            quantity: 2,
            vendorHandle: "olena",
            vendorName: "Майстерня Олени",
          },
        ],
        subtotalUah: 840,
        platformCommissionUah: 84,
        vendorPayoutUah: 756,
        status: "shipped",
        trackingNumber: "DEMO-NP-0000000001",
        trackingStatusCode: 4,
        trackingStatusName: "Посилка прямує до отримувача",
        createdAt: "2026-08-19T10:00:00.000Z",
      },
      {
        id: "child_ord_102",
        parentOrderId: "ord_demo_parent_1",
        parentOrderNumber: "LF-20260819-1001",
        vendorHandle: "berehynia",
        vendorName: "Ткацтво Берегиня",
        items: [
          {
            id: "prod_2",
            slug: "shoper-razom",
            name: "Шопер «Разом»",
            categorySlug: "odiah",
            priceUah: 390,
            quantity: 1,
            vendorHandle: "berehynia",
            vendorName: "Ткацтво Берегиня",
          },
        ],
        subtotalUah: 390,
        platformCommissionUah: 39,
        vendorPayoutUah: 351,
        status: "delivered",
        trackingNumber: "DEMO-NP-0000000002",
        trackingStatusCode: 9,
        trackingStatusName: "Посилку отримано та оплачено (Вручено)",
        createdAt: "2026-08-19T10:00:00.000Z",
        deliveredAt: "2026-08-19T14:30:00.000Z",
        settledAt: "2026-08-19T14:30:05.000Z",
      },
    ],
    escrowHolds: [
      {
        id: "escrow_demo_1",
        parentOrderId: "ord_demo_parent_1",
        amountUah: 1230,
        status: "held",
        provider: "sandbox_escrow",
        heldAt: "2026-08-19T10:00:00.000Z",
      },
    ],
    settlements: [
      {
        id: "settle_demo_102",
        vendorHandle: "berehynia",
        vendorName: "Ткацтво Берегиня",
        childOrderId: "child_ord_102",
        payoutAmountUah: 351,
        commissionAmountUah: 39,
        status: "settled",
        settledAt: "2026-08-19T14:30:05.000Z",
        iban: "UA823052990000026001234567890",
      },
    ],
  };
}

function loadOrderState(): StoredOrderState {
  if (typeof window === "undefined") {
    if (!inMemoryOrderState) {
      inMemoryOrderState = getInitialStoredState();
    }
    return inMemoryOrderState;
  }
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialStoredState();
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    if (!inMemoryOrderState) {
      inMemoryOrderState = getInitialStoredState();
    }
    return inMemoryOrderState;
  }
}

function saveOrderState(state: StoredOrderState): void {
  inMemoryOrderState = state;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const SandboxOrderEngine = {
  createOrder(input: {
    customer: CheckoutCustomerInput;
    items: readonly CartItem[];
  }): {
    parentOrder: ParentOrder;
    childOrders: readonly VendorChildOrder[];
    escrowHold: EscrowHoldRecord;
  } {
    const state = loadOrderState();
    const parentOrderId = `ord_${Date.now()}`;
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const totalAmount = input.items.reduce(
      (sum, i) => sum + i.priceUah * i.quantity,
      0,
    );

    // Group items by vendor
    const vendorMap = new Map<string, { name: string; items: CartItem[] }>();
    for (const item of input.items) {
      const handle = item.vendorHandle || "craft_artisan";
      const name = item.vendorName || "Українська Майстерня";
      if (!vendorMap.has(handle)) {
        vendorMap.set(handle, { name, items: [] });
      }
      vendorMap.get(handle)!.items.push(item);
    }

    const childOrders: VendorChildOrder[] = [];
    const childOrderIds: string[] = [];

    let childIndex = 1;
    for (const [vendorHandle, data] of vendorMap.entries()) {
      const childOrderId = `child_${parentOrderId}_${childIndex++}`;
      childOrderIds.push(childOrderId);

      const subtotal = data.items.reduce(
        (sum, it) => sum + it.priceUah * it.quantity,
        0,
      );
      const commission = Math.round(subtotal * PLATFORM_COMMISSION_RATE);
      const payout = subtotal - commission;

      childOrders.push({
        id: childOrderId,
        parentOrderId,
        parentOrderNumber: orderNumber,
        vendorHandle,
        vendorName: data.name,
        items: data.items,
        subtotalUah: subtotal,
        platformCommissionUah: commission,
        vendorPayoutUah: payout,
        status: "pending",
        trackingNumber: generateTrackingNumber(),
        trackingStatusCode: 1,
        trackingStatusName: NOVA_POSHTA_STATUS_MAP[1],
        createdAt: now,
      });
    }

    const escrowHoldId = `escrow_${parentOrderId}`;
    const escrowHold: EscrowHoldRecord = {
      id: escrowHoldId,
      parentOrderId,
      amountUah: totalAmount,
      status: "held",
      provider: "sandbox_escrow",
      heldAt: now,
    };

    const parentOrder: ParentOrder = {
      id: parentOrderId,
      orderNumber,
      customer: input.customer,
      items: input.items,
      totalAmountUah: totalAmount,
      status: "escrow_held",
      childOrderIds,
      escrowHoldId,
      createdAt: now,
    };

    state.parentOrders.unshift(parentOrder);
    state.childOrders.unshift(...childOrders);
    state.escrowHolds.unshift(escrowHold);

    saveOrderState(state);

    return { parentOrder, childOrders, escrowHold };
  },

  getOrder(orderNumber: string): {
    parentOrder?: ParentOrder;
    childOrders: VendorChildOrder[];
    escrowHold?: EscrowHoldRecord;
    settlements: SettlementBatchRecord[];
  } {
    const state = loadOrderState();
    const parentOrder = state.parentOrders.find(
      (o) => o.orderNumber === orderNumber || o.id === orderNumber,
    );

    if (!parentOrder) {
      return { childOrders: [], settlements: [] };
    }

    const childOrders = state.childOrders.filter(
      (c) => c.parentOrderId === parentOrder.id,
    );
    const escrowHold = state.escrowHolds.find(
      (e) => e.parentOrderId === parentOrder.id,
    );
    const childIds = new Set(childOrders.map((c) => c.id));
    const settlements = state.settlements.filter((s) =>
      childIds.has(s.childOrderId),
    );

    const result: {
      parentOrder?: ParentOrder;
      childOrders: VendorChildOrder[];
      escrowHold?: EscrowHoldRecord;
      settlements: SettlementBatchRecord[];
    } = {
      parentOrder,
      childOrders,
      settlements,
    };

    if (escrowHold) {
      result.escrowHold = escrowHold;
    }

    return result;
  },

  getAllOrders(): ParentOrder[] {
    const state = loadOrderState();
    return state.parentOrders;
  },

  updateTrackingStatus(
    childOrderId: string,
    newStatus: NovaPoshtaTrackingStatus,
  ): {
    childOrder?: VendorChildOrder;
    parentOrder?: ParentOrder;
    settlement?: SettlementBatchRecord;
  } {
    const state = loadOrderState();
    const childIndex = state.childOrders.findIndex(
      (c) => c.id === childOrderId,
    );
    if (childIndex < 0) return {};

    const child = state.childOrders[childIndex];
    if (!child) return {};

    const now = new Date().toISOString();

    let childStatus = child.status;
    let deliveredAt: string | undefined = child.deliveredAt;
    let settledAt: string | undefined = child.settledAt;
    let createdSettlement: SettlementBatchRecord | undefined;

    if (newStatus === 4 || newStatus === 5) {
      childStatus = "shipped";
    } else if (newStatus === 7 || newStatus === 8) {
      childStatus = "shipped";
    } else if (newStatus === 9) {
      childStatus = "delivered";
      deliveredAt = now;
      settledAt = now;

      // Create settlement batch record
      const existingSettlement = state.settlements.find(
        (s) => s.childOrderId === child.id,
      );
      if (!existingSettlement) {
        createdSettlement = {
          id: `settle_${child.id}`,
          vendorHandle: child.vendorHandle,
          vendorName: child.vendorName,
          childOrderId: child.id,
          payoutAmountUah: child.vendorPayoutUah,
          commissionAmountUah: child.platformCommissionUah,
          status: "settled",
          settledAt: now,
          iban: `UA${Math.floor(100000000000000000000000000 + Math.random() * 900000000000000000000000000)}`,
        };
        state.settlements.push(createdSettlement);
      }
    } else if (newStatus === 102 || newStatus === 103) {
      childStatus = "cancelled";
    }

    const updatedChild: VendorChildOrder = {
      id: child.id,
      parentOrderId: child.parentOrderId,
      parentOrderNumber: child.parentOrderNumber,
      vendorHandle: child.vendorHandle,
      vendorName: child.vendorName,
      items: child.items,
      subtotalUah: child.subtotalUah,
      platformCommissionUah: child.platformCommissionUah,
      vendorPayoutUah: child.vendorPayoutUah,
      status: childStatus,
      trackingNumber: child.trackingNumber,
      trackingStatusCode: newStatus,
      trackingStatusName:
        NOVA_POSHTA_STATUS_MAP[newStatus] || "Оновлено статус",
      createdAt: child.createdAt,
      ...(deliveredAt ? { deliveredAt } : {}),
      ...(settledAt ? { settledAt } : {}),
    };
    state.childOrders[childIndex] = updatedChild;

    // Check parent order completion
    const parentIndex = state.parentOrders.findIndex(
      (p) => p.id === child.parentOrderId,
    );
    let updatedParent: ParentOrder | undefined;

    if (parentIndex >= 0) {
      const parent = state.parentOrders[parentIndex];
      if (parent) {
        const siblings = state.childOrders.filter(
          (c) => c.parentOrderId === parent.id,
        );
        const allDelivered = siblings.every(
          (s) => s.status === "delivered" || s.status === "settled",
        );

        if (allDelivered) {
          updatedParent = {
            id: parent.id,
            orderNumber: parent.orderNumber,
            customer: parent.customer,
            items: parent.items,
            totalAmountUah: parent.totalAmountUah,
            status: "completed",
            childOrderIds: parent.childOrderIds,
            ...(parent.escrowHoldId
              ? { escrowHoldId: parent.escrowHoldId }
              : {}),
            createdAt: parent.createdAt,
          };
          state.parentOrders[parentIndex] = updatedParent;

          // Capture escrow hold
          const escrowIndex = state.escrowHolds.findIndex(
            (e) => e.parentOrderId === parent.id,
          );
          if (escrowIndex >= 0 && state.escrowHolds[escrowIndex]) {
            const escrow = state.escrowHolds[escrowIndex]!;
            state.escrowHolds[escrowIndex] = {
              id: escrow.id,
              parentOrderId: escrow.parentOrderId,
              amountUah: escrow.amountUah,
              status: "captured",
              provider: escrow.provider,
              heldAt: escrow.heldAt,
              capturedAt: now,
            };
          }
        }
      }
    }

    saveOrderState(state);

    const res: {
      childOrder?: VendorChildOrder;
      parentOrder?: ParentOrder;
      settlement?: SettlementBatchRecord;
    } = {
      childOrder: updatedChild,
    };
    if (updatedParent) {
      res.parentOrder = updatedParent;
    }
    if (createdSettlement) {
      res.settlement = createdSettlement;
    }
    return res;
  },
};
