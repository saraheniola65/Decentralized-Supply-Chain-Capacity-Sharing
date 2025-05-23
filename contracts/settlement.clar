;; Settlement Contract
;; Handles payment for shared capacity

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u1)
(define-constant ERR-ALREADY-PAID u2)
(define-constant ERR-PAYMENT-NOT-FOUND u3)

;; Payments map
(define-map payments
  { booking-id: uint }
  {
    amount: uint,
    resource-owner: principal,
    booker: principal,
    paid: bool,
    payment-time: uint
  }
)

;; Get payment information
(define-read-only (get-payment (booking-id uint))
  (map-get? payments { booking-id: booking-id })
)

;; Check if payment is paid
(define-read-only (is-paid (booking-id uint))
  (default-to false (get paid (map-get? payments { booking-id: booking-id })))
)

;; Initialize payment for a booking
(define-public (initialize-payment (booking-id uint) (amount uint) (booker principal))
  (begin
    ;; In a real implementation, we would check if the booking exists and is completed
    ;; For simplicity, we're skipping those checks

    (ok (map-set payments
      { booking-id: booking-id }
      {
        amount: amount,
        resource-owner: tx-sender,
        booker: booker,
        paid: false,
        payment-time: u0
      }
    ))
  )
)

;; Make payment for a booking
(define-public (make-payment (booking-id uint))
  (let
    (
      (payment (map-get? payments { booking-id: booking-id }))
    )
    (asserts! (is-some payment) (err ERR-PAYMENT-NOT-FOUND))
    (let ((payment-data (unwrap-panic payment)))
      (asserts! (is-eq tx-sender (get booker payment-data)) (err ERR-NOT-AUTHORIZED))
      (asserts! (not (get paid payment-data)) (err ERR-ALREADY-PAID))

      ;; In a real implementation, we would transfer tokens here
      ;; For simplicity, we're just marking it as paid

      (ok (map-set payments
        { booking-id: booking-id }
        (merge payment-data
          {
            paid: true,
            payment-time: block-height
          }
        )
      ))
    )
  )
)
