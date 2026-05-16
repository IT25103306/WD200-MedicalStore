// Payment dto - Managed by IT25103696

package com.WD200.MedicalStore.dto;

public class PaymentRequest {

    private Long orderId;
    private String method; // CASH, CARD, BANK_TRANSFER, ONLINE

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
}
