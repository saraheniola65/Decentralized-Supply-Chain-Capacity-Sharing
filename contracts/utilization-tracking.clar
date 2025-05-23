;; Utilization Tracking Contract
;; Monitors resource usage

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u1)
(define-constant ERR-RECORD-EXISTS u2)
(define-constant ERR-INVALID-SCORE u3)
(define-constant ERR-INVALID-PERIOD u4)
(define-constant ERR-RECORD-NOT-FOUND u5)

;; Utilization records map
(define-map utilization-records
  { booking-id: uint }
  {
    booker: principal,
    actual-start-time: uint,
    actual-end-time: uint,
    actual-capacity-used: uint,
    quality-score: uint,
    notes: (string-utf8 200)
  }
)

;; Get utilization record
(define-read-only (get-utilization-record (booking-id uint))
  (map-get? utilization-records { booking-id: booking-id })
)

;; Record utilization for a booking
(define-public (record-utilization
    (booking-id uint)
    (actual-start-time uint)
    (actual-end-time uint)
    (actual-capacity-used uint)
    (quality-score uint)
    (notes (string-utf8 200)))
  (begin
    ;; In a real implementation, we would check if the booking exists and is completed
    ;; For simplicity, we're skipping those checks

    (asserts! (is-none (get-utilization-record booking-id)) (err ERR-RECORD-EXISTS))
    (asserts! (> actual-end-time actual-start-time) (err ERR-INVALID-PERIOD))
    (asserts! (and (>= quality-score u0) (<= quality-score u10)) (err ERR-INVALID-SCORE))

    (ok (map-set utilization-records
      { booking-id: booking-id }
      {
        booker: tx-sender,
        actual-start-time: actual-start-time,
        actual-end-time: actual-end-time,
        actual-capacity-used: actual-capacity-used,
        quality-score: quality-score,
        notes: notes
      }
    ))
  )
)

;; Update utilization record
(define-public (update-utilization-record
    (booking-id uint)
    (quality-score uint)
    (notes (string-utf8 200)))
  (let
    (
      (record (map-get? utilization-records { booking-id: booking-id }))
    )
    (asserts! (is-some record) (err ERR-RECORD-NOT-FOUND))
    (let ((record-data (unwrap-panic record)))
      (asserts! (is-eq tx-sender (get booker record-data)) (err ERR-NOT-AUTHORIZED))
      (asserts! (and (>= quality-score u0) (<= quality-score u10)) (err ERR-INVALID-SCORE))

      (ok (map-set utilization-records
        { booking-id: booking-id }
        (merge record-data
          {
            quality-score: quality-score,
            notes: notes
          }
        )
      ))
    )
  )
)
