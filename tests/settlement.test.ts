import { describe, it, expect, beforeEach } from "vitest"

// Mock state
let payments = new Map()
let verifiedEntities = new Set()
let bookings = new Map()

// Mock contract functions
const settlement = {
  setSender: (sender) => {
    currentSender = sender
  },
  
  setVerified: (entity, isVerified) => {
    if (isVerified) {
      verifiedEntities.add(entity)
    } else {
      verifiedEntities.delete(entity)
    }
  },
  
  isVerified: (entity) => {
    return verifiedEntities.has(entity)
  },
  
  addBooking: (bookingId, booking) => {
    bookings.set(bookingId, booking)
  },
  
  getBooking: (bookingId) => {
    return bookings.get(bookingId)
  },
  
  initializePayment: (bookingId) => {
    const sender = currentSender
    
    if (!verifiedEntities.has(sender)) {
      return { error: "Not verified" }
    }
    
    const booking = bookings.get(bookingId)
    if (!booking) {
      return { error: "Booking not found" }
    }
    
    if (sender !== booking.resourceOwner) {
      return { error: "Unauthorized" }
    }
    
    if (booking.status !== 2) {
      // Not completed
      return { error: "Invalid status" }
    }
    
    payments.set(bookingId, {
      amount: booking.totalCost,
      paid: false,
      paymentTime: 0,
      paymentTx: null,
    })
    
    return { success: true }
  },
  
  makePayment: (bookingId) => {
    const sender = currentSender
    
    if (!verifiedEntities.has(sender)) {
      return { error: "Not verified" }
    }
    
    const booking = bookings.get(bookingId)
    if (!booking) {
      return { error: "Booking not found" }
    }
    
    if (sender !== booking.booker) {
      return { error: "Unauthorized" }
    }
    
    const payment = payments.get(bookingId)
    if (!payment) {
      return { error: "Payment not initialized" }
    }
    
    if (payment.paid) {
      return { error: "Already paid" }
    }
    
    payment.paid = true
    payment.paymentTime = 123 // Mock block height
    payment.paymentTx = "0x00" // Mock transaction ID
    payments.set(bookingId, payment)
    
    return { success: true }
  },
  
  getPayment: (bookingId) => {
    return (
        payments.get(bookingId) || {
          amount: 0,
          paid: false,
          paymentTime: 0,
          paymentTx: null,
        }
    )
  },
  
  isPaid: (bookingId) => {
    const payment = payments.get(bookingId)
    return payment ? payment.paid : false
  },
}

let currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"

describe("Settlement Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    payments = new Map()
    verifiedEntities = new Set()
    bookings = new Map()
    currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Add a completed booking for testing
    const resourceOwner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const booker = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    settlement.addBooking(1, {
      resourceOwner,
      resourceId: 1,
      booker,
      startTime: 120,
      endTime: 180,
      capacityBooked: 500,
      status: 2, // Completed
      totalCost: 1500000,
    })
  })
  
  it("should initialize payment for a completed booking", () => {
    // Set the resource owner as verified
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    
    const result = settlement.initializePayment(1)
    
    expect(result.success).toBe(true)
    
    const payment = settlement.getPayment(1)
    expect(payment.amount).toBe(1500000)
    expect(payment.paid).toBe(false)
  })
  
  it("should not initialize payment for unverified entity", () => {
    // Resource owner is not verified
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    
    const result = settlement.initializePayment(1)
    
    expect(result.error).toBe("Not verified")
  })
  
  it("should not initialize payment for non-owner", () => {
    // Set a different entity as verified
    settlement.setSender("ST4PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST4PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    
    const result = settlement.initializePayment(1)
    
    expect(result.error).toBe("Unauthorized")
  })
  
  it("should not initialize payment for non-completed booking", () => {
    // Set the resource owner as verified
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    
    // Add a pending booking
    settlement.addBooking(2, {
      resourceOwner: "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      resourceId: 1,
      booker: "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      startTime: 120,
      endTime: 180,
      capacityBooked: 500,
      status: 0, // Pending
      totalCost: 1500000,
    })
    
    const result = settlement.initializePayment(2)
    
    expect(result.error).toBe("Invalid status")
  })
  
  it("should make payment for initialized payment", () => {
    // Initialize payment first
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    settlement.initializePayment(1)
    
    // Make payment as booker
    settlement.setSender("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    
    const result = settlement.makePayment(1)
    
    expect(result.success).toBe(true)
    expect(settlement.isPaid(1)).toBe(true)
    
    const payment = settlement.getPayment(1)
    expect(payment.paid).toBe(true)
    expect(payment.paymentTime).toBe(123)
    expect(payment.paymentTx).toBe("0x00")
  })
  
  it("should not make payment for unverified entity", () => {
    // Initialize payment
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    settlement.initializePayment(1)
    
    // Try to make payment as unverified booker
    settlement.setSender("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    
    const result = settlement.makePayment(1)
    
    expect(result.error).toBe("Not verified")
  })
  
  it("should not make payment for non-booker", () => {
    // Initialize payment
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    settlement.initializePayment(1)
    
    // Try to make payment as someone else
    settlement.setSender("ST4PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST4PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    
    const result = settlement.makePayment(1)
    
    expect(result.error).toBe("Unauthorized")
  })
  
  it("should not make payment twice", () => {
    // Initialize payment
    settlement.setSender("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    settlement.initializePayment(1)
    
    // Make payment once
    settlement.setSender("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    settlement.setVerified("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    settlement.makePayment(1)
    
    // Try to make payment again
    const result = settlement.makePayment(1)
    
    expect(result.error).toBe("Already paid")
  })
})
