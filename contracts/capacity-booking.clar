;; Capacity Booking Contract
;; Manages reservation of resources

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u1)
(define-constant ERR-RESOURCE-NOT-FOUND u2)
(define-constant ERR-INSUFFICIENT-CAPACITY u3)
(define-constant ERR-BOOKING-NOT-FOUND u4)
(define-constant ERR-INVALID-PERIOD u5)
(define-constant ERR-INVALID-STATUS u6)

;; Booking status: 0 = pending, 1 = confirmed, 2 = completed, 3 = cancelled
(define-map bookings
  { booking-id: uint }
  {
    resource-owner: principal,
    resource-id: uint,
    booker: principal,
    start-time: uint,
    end-time: uint,
    capacity-booked: uint,
    status: uint,
    total-cost: uint
  }
)

;; Booking counter
(define-data-var booking-counter uint u0)

;; Get booking information
(define-read-only (get-booking (booking-id uint))
  (map-get? bookings { booking-id: booking-id })
)

;; Get booking count
(define-read-only (get-booking-count)
  (var-get booking-counter)
)

;; Create a new booking
(define-public (create-booking
    (resource-owner principal)
    (resource-id uint)
    (start-time uint)
    (end-time uint)
    (capacity-needed uint)
    (rate-per-unit uint))
  (let
    (
      (new-id (+ (var-get booking-counter) u1))
      (duration (- end-time start-time))
      (total-cost (* (* capacity-needed rate-per-unit) duration))
    )
    ;; In a real implementation, we would check if the resource exists and has enough capacity
    ;; For simplicity, we're skipping those checks

    (asserts! (> end-time start-time) (err ERR-INVALID-PERIOD))

    (var-set booking-counter new-id)
    (ok (map-set bookings
      { booking-id: new-id }
      {
        resource-owner: resource-owner,
        resource-id: resource-id,
        booker: tx-sender,
        start-time: start-time,
        end-time: end-time,
        capacity-booked: capacity-needed,
        status: u0, ;; Pending
        total-cost: total-cost
      }
    ))
  )
)

;; Confirm a booking (resource owner only)
(define-public (confirm-booking (booking-id uint))
  (let
    (
      (booking (map-get? bookings { booking-id: booking-id }))
    )
    (asserts! (is-some booking) (err ERR-BOOKING-NOT-FOUND))
    (let ((booking-data (unwrap-panic booking)))
      (asserts! (is-eq tx-sender (get resource-owner booking-data)) (err ERR-NOT-AUTHORIZED))
      (asserts! (is-eq (get status booking-data) u0) (err ERR-INVALID-STATUS))

      (ok (map-set bookings
        { booking-id: booking-id }
        (merge booking-data { status: u1 }) ;; Confirmed
      ))
    )
  )
)

;; Complete a booking (resource owner or booker)
(define-public (complete-booking (booking-id uint))
  (let
    (
      (booking (map-get? bookings { booking-id: booking-id }))
    )
    (asserts! (is-some booking) (err ERR-BOOKING-NOT-FOUND))
    (let ((booking-data (unwrap-panic booking)))
      (asserts! (or
        (is-eq tx-sender (get resource-owner booking-data))
        (is-eq tx-sender (get booker booking-data))
      ) (err ERR-NOT-AUTHORIZED))
      (asserts! (is-eq (get status booking-data) u1) (err ERR-INVALID-STATUS))

      (ok (map-set bookings
        { booking-id: booking-id }
        (merge booking-data { status: u2 }) ;; Completed
      ))
    )
  )
)

;; Cancel a booking (resource owner or booker)
(define-public (cancel-booking (booking-id uint))
  (let
    (
      (booking (map-get? bookings { booking-id: booking-id }))
    )
    (asserts! (is-some booking) (err ERR-BOOKING-NOT-FOUND))
    (let ((booking-data (unwrap-panic booking)))
      (asserts! (or
        (is-eq tx-sender (get resource-owner booking-data))
        (is-eq tx-sender (get booker booking-data))
      ) (err ERR-NOT-AUTHORIZED))
      (asserts! (< (get status booking-data) u2) (err ERR-INVALID-STATUS))

      (ok (map-set bookings
        { booking-id: booking-id }
        (merge booking-data { status: u3 }) ;; Cancelled
      ))
    )
  )
)
