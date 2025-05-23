;; Resource Registration Contract
;; Records available logistics assets

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u1)
(define-constant ERR-RESOURCE-NOT-FOUND u2)
(define-constant ERR-INVALID-PERIOD u3)

;; Resources map
(define-map resources
  { owner: principal, resource-id: uint }
  {
    resource-type: (string-utf8 50),
    capacity: uint,
    location: (string-utf8 100),
    availability-start: uint,
    availability-end: uint,
    rate-per-unit: uint,
    is-active: bool
  }
)

;; Resource counter
(define-data-var resource-counter uint u0)

;; Get resource information
(define-read-only (get-resource (owner principal) (resource-id uint))
  (map-get? resources { owner: owner, resource-id: resource-id })
)

;; Get resource count
(define-read-only (get-resource-count)
  (var-get resource-counter)
)

;; Check if sender is verified (simplified - in a real system, this would check entity-verification contract)
(define-read-only (is-sender-verified)
  ;; Simplified: always return true for testing
  ;; In a real implementation, this would check the entity-verification contract
  true
)

;; Register a new resource
(define-public (register-resource
    (resource-type (string-utf8 50))
    (capacity uint)
    (location (string-utf8 100))
    (availability-start uint)
    (availability-end uint)
    (rate-per-unit uint))
  (let
    (
      (new-id (+ (var-get resource-counter) u1))
    )
    ;; Simplified verification check
    ;; In a real implementation, this would call the entity-verification contract

    (asserts! (>= availability-end availability-start) (err ERR-INVALID-PERIOD))

    (var-set resource-counter new-id)
    (ok (map-set resources
      { owner: tx-sender, resource-id: new-id }
      {
        resource-type: resource-type,
        capacity: capacity,
        location: location,
        availability-start: availability-start,
        availability-end: availability-end,
        rate-per-unit: rate-per-unit,
        is-active: true
      }
    ))
  )
)

;; Update an existing resource
(define-public (update-resource
    (resource-id uint)
    (capacity uint)
    (availability-start uint)
    (availability-end uint)
    (rate-per-unit uint))
  (let
    (
      (resource-key { owner: tx-sender, resource-id: resource-id })
      (resource (map-get? resources resource-key))
    )
    (asserts! (is-some resource) (err ERR-RESOURCE-NOT-FOUND))
    (asserts! (>= availability-end availability-start) (err ERR-INVALID-PERIOD))

    (ok (map-set resources
      resource-key
      (merge (unwrap-panic resource)
        {
          capacity: capacity,
          availability-start: availability-start,
          availability-end: availability-end,
          rate-per-unit: rate-per-unit
        }
      )
    ))
  )
)

;; Deactivate a resource (soft delete)
(define-public (deactivate-resource (resource-id uint))
  (let
    (
      (resource-key { owner: tx-sender, resource-id: resource-id })
      (resource (map-get? resources resource-key))
    )
    (asserts! (is-some resource) (err ERR-RESOURCE-NOT-FOUND))

    (ok (map-set resources
      resource-key
      (merge (unwrap-panic resource) { is-active: false })
    ))
  )
)
