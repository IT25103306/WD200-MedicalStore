// Payment - Managed by IT25103696

package com.WD200.MedicalStore.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")

public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ FK to Order
    @OneToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private Double amount;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    // CASH, CARD, BANK_TRANSFER, ONLINE
    private String method;

    private LocalDateTime paymentDate;

    public Payment() {}

    public Payment(Order order, Double amount, PaymentStatus status,
                   String method, LocalDateTime paymentDate) {
        this.order = order;
        this.amount = amount;
        this.status = status;
        this.method = method;
        this.paymentDate = paymentDate;
    }

    public Long getId() { return id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }
}
