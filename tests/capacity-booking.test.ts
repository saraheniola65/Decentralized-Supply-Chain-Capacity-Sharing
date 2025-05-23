import { describe, it, expect, beforeEach } from "vitest"

// Mock state
let bookings = new Map()
let bookingCounter = 0
let currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"

// Mock contract functions
const capacityBooking = {
  setSender: (sender) => {
    currentSender = sender
  },
  
  createBooking: (resourceOwner, resourceId, startTime, endTime, capacityNeeded, ratePerUnit) => {
    if (endTime <= startTime) {
      return { error: "Invalid period" }
    }
    
    bookingCounter++
    const bookingId = bookingCounter
    const duration = endTime - startTime
    const totalCost = capacityNeeded * ratePerUnit * duration
    
    bookings.set(bookingId, {
      resourceOwner,
      resourceId,
      booker: currentSender,
      startTime,
      endTime,
      capacityBooked: capacityNeeded,
      status: 0, // Pending
      totalCost,
    })
    
    return { success: true, bookingId }
  },
  
  confirmBooking: (bookingId) => {
    const booking = bookings.get(bookingId)
    
    if (!booking) {
      return { error: "Booking not found" }
    }
    
    if (currentSender !== booking.resourceOwner) {
      return { error: "Not authorized" }
    }
    
    if (booking.status !== 0) {
      return { error: "Invalid status" }
    }
    
    booking.status = 1 // Confirmed
    bookings.set(bookingId, booking)
    
    return { success: true }
  },
  
  completeBooking: (bookingId) => {
    const booking = bookings.get(bookingId)
    
    if (!booking) {
      return { error: "Booking not found" }
    }
    
    if (currentSender !== booking.resourceOwner && currentSender !== booking.booker) {
      return { error: "Not authorized" }
    }
    
    if (booking.status !== 1) {
      return { error: "Invalid status" }
    }
    
    booking.status = 2 // Completed
    bookings.set(bookingId, booking)
    
    return { success: true }
  },
  
  cancelBooking: (bookingId) => {
    const booking = bookings.get(bookingId)
    
    if (!booking) {
      return { error: "Booking not found" }
    }
    
    if (currentSender !== booking.resourceOwner && currentSender !== booking.booker) {
      return { error: "Not authorized" }
    }
    
    if (booking.status >= 2) {
      return { error: "Invalid status" }
    }
    
    booking.status = 3 // Cancelled
    bookings.set(bookingId, booking)
    
    return { success: true }
  },
  
  getBooking: (bookingId) => {
    return bookings.get(bookingId)
  },
  
  getBookingCount: () => {
    return bookingCounter
  },
}

describe("Capacity Booking Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    bookings = new Map()
    bookingCounter = 0
    currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  })
  
  it("should create a booking", () => {
    const resourceOwner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    const result = capacityBooking.createBooking(
        resourceOwner,
        1, // Resource ID
        120, // Start time
        180, // End time
        500, // Capacity needed
        50, // Rate per unit
    )
    
    expect(result.success).toBe(true)
    expect(result.bookingId).toBe(1)
    
    const booking = capacityBooking.getBooking(1)
    expect(booking.resourceOwner).toBe(resourceOwner)
    expect(booking.resourceId).toBe(1)
    expect(booking.capacityBooked).toBe(500)
    expect(booking.status).toBe(0) // Pending
    expect(booking.totalCost).toBe(1500000) // 500 * 50 * (180-120)
  })
  
  it("should not create a booking with invalid period", () => {
    const resourceOwner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    const result = capacityBooking.createBooking(
        resourceOwner,
        1,
        180, // Start time greater than end time
        180, // End time
        500,
        50,
    )
    
    expect(result.error).toBe("Invalid period")
  })
  
  it("should confirm a booking by resource owner", () => {
    // Create a booking
    const resourceOwner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    capacityBooking.createBooking(resourceOwner, 1, 120, 180, 500, 50)
    
    // Switch to resource owner
    capacityBooking.setSender(resourceOwner)
    
    // Confirm the booking
    const result = capacityBooking.confirmBooking(1)
    
    expect(result.success).toBe(true)
    expect(capacityBooking.getBooking(1).status).toBe(1) // Confirmed
  })
  
  it("should not confirm a booking by non-owner", () => {
    // Create a booking
    const resourceOwner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    capacityBooking.createBooking(resourceOwner, 1, 120, 180, 500, 50)
    
    // Try to confirm as non-owner (current sender is not changed)
    const result = capacityBooking.confirmBooking(1)
    
    expect(result.error).toBe("Not authorized")
  })
})
