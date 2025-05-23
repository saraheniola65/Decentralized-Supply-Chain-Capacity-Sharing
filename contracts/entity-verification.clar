;; Entity Verification Contract
;; Validates supply chain participants

;; Define admin principal
(define-data-var admin principal tx-sender)

;; Entity status: 0 = unverified, 1 = verified, 2 = suspended
(define-map entities principal
  {
    status: uint,
    name: (string-utf8 100),
    entity-type: (string-utf8 50),
    registration-date: uint
  }
)

;; Read entity information
(define-read-only (get-entity (entity-id principal))
  (default-to
    {
      status: u0,
      name: u"",
      entity-type: u"",
      registration-date: u0
    }
    (map-get? entities entity-id)
  )
)

;; Check if entity is verified
(define-read-only (is-verified (entity-id principal))
  (let ((entity (get-entity entity-id)))
    (is-eq (get status entity) u1)
  )
)

;; Register a new entity
(define-public (register-entity (name (string-utf8 100)) (entity-type (string-utf8 50)))
  (let ((entity (get-entity tx-sender)))
    (if (> (get registration-date entity) u0)
      (err u"Entity already registered")
      (ok (map-set entities tx-sender
        {
          status: u0,
          name: name,
          entity-type: entity-type,
          registration-date: block-height
        }
      ))
    )
  )
)

;; Verify an entity (admin only)
(define-public (verify-entity (entity-id principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u"Not authorized"))
    (let ((entity (get-entity entity-id)))
      (if (> (get registration-date entity) u0)
        (ok (map-set entities entity-id
          (merge entity { status: u1 })
        ))
        (err u"Entity not found")
      )
    )
  )
)

;; Suspend an entity (admin only)
(define-public (suspend-entity (entity-id principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u"Not authorized"))
    (let ((entity (get-entity entity-id)))
      (if (> (get registration-date entity) u0)
        (ok (map-set entities entity-id
          (merge entity { status: u2 })
        ))
        (err u"Entity not found")
      )
    )
  )
)

;; Transfer admin rights (admin only)
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u"Not authorized"))
    (ok (var-set admin new-admin))
  )
)
