// Payment Service - Managed by IT25103696

package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.dto.PaymentRequest;
import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.*;
import com.WD200.MedicalStore.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service

public class PaymentService {

    private final PaymentRepository repo;
    private final OrderService orderService;

    public PaymentService(PaymentRepository repo, OrderService orderService) {
        this.repo = repo;
        this.orderService = orderService;
    }

    public Payment create(PaymentRequest request) {
        Order order = orderService.getById(request.getOrderId());

        // ✅ Prevent duplicate payment
        repo.findByOrder_Id(order.getId()).ifPresent(p -> {
            throw new IllegalStateException("Payment already exists for order: " + order.getId());
        });

        Payment payment = new Payment(
                order,
                order.getTotalPrice(),
                PaymentStatus.COMPLETED,
                request.getMethod(),
                LocalDateTime.now()
        );

        // ✅ Auto-confirm order on payment
        orderService.updateStatus(order.getId(), "CONFIRMED");

        return repo.save(payment);
    }

    public List<Payment> getAll() {
        return repo.findAll();
    }

    public Payment getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + id));
    }

    public Payment getByOrderId(Long orderId) {
        return repo.findByOrder_Id(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No payment for order: " + orderId));
    }

    public List<Payment> getByStatus(PaymentStatus status) {
        return repo.findByStatus(status);
    }

    public Payment updateStatus(Long id, PaymentStatus status) {
        Payment existing = getById(id);
        existing.setStatus(status);
        return repo.save(existing);
    }

    public void delete(Long id) {
        repo.delete(getById(id));
    }
}

