import { describe, it, expect, beforeEach } from "vitest"

// Mock state
let resources = new Map()
let resourceCounter = 0
let currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"

// Mock contract functions
const resourceRegistration = {
  setSender: (sender) => {
    currentSender = sender
  },
  
  registerResource: (resourceType, capacity, location, availabilityStart, availabilityEnd, ratePerUnit) => {
    if (availabilityEnd < availabilityStart) {
      return { error: "Invalid availability period" }
    }
    
    resourceCounter++
    const resourceId = resourceCounter
    const key = JSON.stringify({ owner: currentSender, resourceId })
    
    resources.set(key, {
      resourceType,
      capacity,
      location,
      availabilityStart,
      availabilityEnd,
      ratePerUnit,
      isActive: true,
    })
    
    return { success: true, resourceId }
  },
  
  updateResource: (resourceId, capacity, availabilityStart, availabilityEnd, ratePerUnit) => {
    const key = JSON.stringify({ owner: currentSender, resourceId })
    const resource = resources.get(key)
    
    if (!resource) {
      return { error: "Resource not found" }
    }
    
    if (availabilityEnd < availabilityStart) {
      return { error: "Invalid availability period" }
    }
    
    resource.capacity = capacity
    resource.availabilityStart = availabilityStart
    resource.availabilityEnd = availabilityEnd
    resource.ratePerUnit = ratePerUnit
    
    resources.set(key, resource)
    
    return { success: true }
  },
  
  deactivateResource: (resourceId) => {
    const key = JSON.stringify({ owner: currentSender, resourceId })
    const resource = resources.get(key)
    
    if (!resource) {
      return { error: "Resource not found" }
    }
    
    resource.isActive = false
    resources.set(key, resource)
    
    return { success: true }
  },
  
  getResource: (owner, resourceId) => {
    const key = JSON.stringify({ owner, resourceId })
    return resources.get(key)
  },
  
  getResourceCount: () => {
    return resourceCounter
  },
}

describe("Resource Registration Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    resources = new Map()
    resourceCounter = 0
    currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  })
  
  it("should register a new resource", () => {
    const result = resourceRegistration.registerResource(
        "Warehouse",
        1000,
        "New York",
        100, // Start time
        200, // End time
        50, // Rate per unit
    )
    
    expect(result.success).toBe(true)
    expect(result.resourceId).toBe(1)
    
    const resource = resourceRegistration.getResource(currentSender, 1)
    expect(resource.resourceType).toBe("Warehouse")
    expect(resource.capacity).toBe(1000)
    expect(resource.location).toBe("New York")
    expect(resource.isActive).toBe(true)
  })
  
  it("should not register a resource with invalid availability period", () => {
    const result = resourceRegistration.registerResource(
        "Warehouse",
        1000,
        "New York",
        200, // Start time greater than end time
        100, // End time
        50,
    )
    
    expect(result.error).toBe("Invalid availability period")
  })
  
  it("should update an existing resource", () => {
    resourceRegistration.registerResource("Warehouse", 1000, "New York", 100, 200, 50)
    
    const result = resourceRegistration.updateResource(
        1, // Resource ID
        2000, // New capacity
        150, // New start time
        250, // New end time
        75, // New rate
    )
    
    expect(result.success).toBe(true)
    
    const resource = resourceRegistration.getResource(currentSender, 1)
    expect(resource.capacity).toBe(2000)
    expect(resource.availabilityStart).toBe(150)
    expect(resource.availabilityEnd).toBe(250)
    expect(resource.ratePerUnit).toBe(75)
  })
  
  it("should deactivate a resource", () => {
    resourceRegistration.registerResource("Warehouse", 1000, "New York", 100, 200, 50)
    
    const result = resourceRegistration.deactivateResource(1)
    
    expect(result.success).toBe(true)
    
    const resource = resourceRegistration.getResource(currentSender, 1)
    expect(resource.isActive).toBe(false)
  })
})
