import { describe, it, expect, beforeEach } from "vitest"

// Mock state
let utilizationRecords = new Map()
let verifiedEntities = new Set()
let bookings = new Map()

// Mock contract functions
const utilizationTracking = {
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
  
  recordUtilization: (bookingId, actualStartTime, actualEndTime, actualCapacityUsed, qualityScore, notes) => {
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
    
    if (booking.status !== 2) {
      // Not completed
      return { error: "Invalid status" }
    }
    
    if (utilizationRecords.has(bookingId)) {
      return { error: "Record exists" }
    }
    
    if (actualEndTime <= actualStartTime) {
      return { error: "Invalid time period" }
    }
    
    if (qualityScore < 0 || qualityScore > 10) {
      return { error: "Quality score must be between 0-10" }
    }
    
    utilizationRecords.set(bookingId, {
      actualStartTime,
      actualEndTime,
      actualCapacityUsed,
      qualityScore,
      notes,
    })
    
    return { success: true }
  },
  
  updateUtilizationRecord: (bookingId, qualityScore, notes) => {
    const sender = currentSender
    
    const booking = bookings.get(bookingId)
    if (!booking) {
      return { error: "Booking not found" }
    }
    
    if (sender !== booking.booker) {
      return { error: "Unauthorized" }
    }
    
    const record = utilizationRecords.get(bookingId)
    if (!record) {
      return { error: "Record not found" }
    }
    
    if (qualityScore < 0 || qualityScore > 10) {
      return { error: "Quality score must be between 0-10" }
    }
    
    record.qualityScore = qualityScore
    record.notes = notes
    utilizationRecords.set(bookingId, record)
    
    return { success: true }
  },
  
  getUtilizationRecord: (bookingId) => {
    return utilizationRecords.get(bookingId)
  },
}

let currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"

describe("Utilization Tracking Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    utilizationRecords = new Map()
    verifiedEntities = new Set()
    bookings = new Map()
    currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Add a completed booking for testing
    const resourceOwner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    utilizationTracking.addBooking(1, {
      resourceOwner,
      resourceId: 1,
      booker: currentSender,
      startTime: 120,
      endTime: 180,
      capacityBooked: 500,
      status: 2, // Completed
      totalCost: 1500000,
    })
  })
  
  it("should record utilization for a completed booking", () => {
    // Set the entity as verified
    utilizationTracking.setVerified(currentSender, true)
    
    const result = utilizationTracking.recordUtilization(
        1, // Booking ID
        125, // Actual start time
        175, // Actual end time
        450, // Actual capacity used
        8, // Quality score
        "Good service, slightly less capacity than expected",
    )
    
    expect(result.success).toBe(true)
    
    const record = utilizationTracking.getUtilizationRecord(1)
    expect(record.actualStartTime).toBe(125)
    expect(record.actualEndTime).toBe(175)
    expect(record.actualCapacityUsed).toBe(450)
    expect(record.qualityScore).toBe(8)
  })
  
  it("should not record utilization for unverified entity", () => {
    // Entity is not verified
    const result = utilizationTracking.recordUtilization(1, 125, 175, 450, 8, "Good service")
    
    expect(result.error).toBe("Not verified")
  })
  
  it("should not record utilization for non-booker", () => {
    // Set the entity as verified
    utilizationTracking.setVerified(currentSender, true)
    
    // Switch to a different sender
    utilizationTracking.setSender("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    utilizationTracking.setVerified("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    
    const result = utilizationTracking.recordUtilization(1, 125, 175, 450, 8, "Good service")
    
    expect(result.error).toBe("Unauthorized")
  })
  
  it("should not record utilization for non-completed booking", () => {
    // Set the entity as verified
    utilizationTracking.setVerified(currentSender, true)
    
    // Add a pending booking
    utilizationTracking.addBooking(2, {
      resourceOwner: "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      resourceId: 1,
      booker: currentSender,
      startTime: 120,
      endTime: 180,
      capacityBooked: 500,
      status: 0, // Pending
      totalCost: 1500000,
    })
    
    const result = utilizationTracking.recordUtilization(2, 125, 175, 450, 8, "Good service")
    
    expect(result.error).toBe("Invalid status")
  })
  
  it("should not record utilization twice for the same booking", () => {
    // Set the entity as verified
    utilizationTracking.setVerified(currentSender, true)
    
    // Record utilization once
    utilizationTracking.recordUtilization(1, 125, 175, 450, 8, "Good service")
    
    // Try to record again
    const result = utilizationTracking.recordUtilization(1, 130, 170, 400, 7, "Different notes")
    
    expect(result.error).toBe("Record exists")
  })
  
  it("should update an existing utilization record", () => {
    // Set the entity as verified
    utilizationTracking.setVerified(currentSender, true)
    
    // Record utilization
    utilizationTracking.recordUtilization(1, 125, 175, 450, 8, "Good service")
    
    // Update the record
    const result = utilizationTracking.updateUtilizationRecord(1, 9, "Updated: Excellent service")
    
    expect(result.success).toBe(true)
    
    const record = utilizationTracking.getUtilizationRecord(1)
    expect(record.qualityScore).toBe(9)
    expect(record.notes).toBe("Updated: Excellent service")
    // Other fields should remain unchanged
    expect(record.actualStartTime).toBe(125)
    expect(record.actualEndTime).toBe(175)
    expect(record.actualCapacityUsed).toBe(450)
  })
})
