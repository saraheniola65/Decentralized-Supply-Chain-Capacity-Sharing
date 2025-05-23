import { describe, it, expect, beforeEach } from "vitest"

// Mock state
let entities = new Map()
let admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" // Example principal
let currentSender = admin

// Mock contract functions
const entityVerification = {
  setSender: (sender) => {
    currentSender = sender
  },
  
  registerEntity: (name, entityType) => {
    const entity = entities.get(currentSender)
    if (entity && entity.registrationDate > 0) {
      return { error: "Entity already registered" }
    }
    
    entities.set(currentSender, {
      status: 0,
      name,
      entityType,
      registrationDate: 123, // Mock block height
    })
    
    return { success: true }
  },
  
  verifyEntity: (entityId) => {
    if (currentSender !== admin) {
      return { error: "Not authorized" }
    }
    
    const entity = entities.get(entityId)
    if (!entity || entity.registrationDate === 0) {
      return { error: "Entity not found" }
    }
    
    entity.status = 1
    entities.set(entityId, entity)
    
    return { success: true }
  },
  
  suspendEntity: (entityId) => {
    if (currentSender !== admin) {
      return { error: "Not authorized" }
    }
    
    const entity = entities.get(entityId)
    if (!entity || entity.registrationDate === 0) {
      return { error: "Entity not found" }
    }
    
    entity.status = 2
    entities.set(entityId, entity)
    
    return { success: true }
  },
  
  getEntity: (entityId) => {
    return (
        entities.get(entityId) || {
          status: 0,
          name: "",
          entityType: "",
          registrationDate: 0,
        }
    )
  },
  
  isVerified: (entityId) => {
    const entity = entities.get(entityId)
    return entity && entity.status === 1
  },
  
  transferAdmin: (newAdmin) => {
    if (currentSender !== admin) {
      return { error: "Not authorized" }
    }
    
    admin = newAdmin
    return { success: true }
  },
}

describe("Entity Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    entities = new Map()
    admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    currentSender = admin
  })
  
  it("should register a new entity", () => {
    const result = entityVerification.registerEntity("Test Company", "Manufacturer")
    expect(result.success).toBe(true)
    
    const entity = entityVerification.getEntity(currentSender)
    expect(entity.name).toBe("Test Company")
    expect(entity.entityType).toBe("Manufacturer")
    expect(entity.status).toBe(0) // Unverified
  })
  
  it("should not register an entity twice", () => {
    entityVerification.registerEntity("Test Company", "Manufacturer")
    const result = entityVerification.registerEntity("Test Company 2", "Supplier")
    
    expect(result.error).toBe("Entity already registered")
  })
  
  it("should verify an entity", () => {
    // Register a new entity with a different sender
    const entityId = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    entityVerification.setSender(entityId)
    entityVerification.registerEntity("Test Company", "Manufacturer")
    
    // Switch back to admin to verify
    entityVerification.setSender(admin)
    const result = entityVerification.verifyEntity(entityId)
    
    expect(result.success).toBe(true)
    expect(entityVerification.isVerified(entityId)).toBe(true)
  })
  
  it("should not allow non-admin to verify entities", () => {
    // Register a new entity
    const entityId = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    entityVerification.setSender(entityId)
    entityVerification.registerEntity("Test Company", "Manufacturer")
    
    // Try to verify as non-admin
    const result = entityVerification.verifyEntity(entityId)
    
    expect(result.error).toBe("Not authorized")
    expect(entityVerification.isVerified(entityId)).toBe(false)
  })
})
