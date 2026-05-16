// Payment controller - Managed by IT25103696

package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.dto.PaymentRequest;
import com.WD200.MedicalStore.model.Payment;
import com.WD200.MedicalStore.model.PaymentStatus;
import com.WD200.MedicalStore.service.PaymentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/payments")
@CrossOrigin

public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    /*
      POST /payments
      { "orderId": 1, "method": "CARD" }
    */
    @PostMapping
    public Payment create(@RequestBody PaymentRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<Payment> getAll() { return service.getAll(); }

    @GetMapping("/{id}")
    public Payment getById(@PathVariable Long id) { return service.getById(id); }

    @GetMapping("/order/{orderId}")
    public Payment getByOrder(@PathVariable Long orderId) {
        return service.getByOrderId(orderId);
    }

    @GetMapping("/status/{status}")
    public List<Payment> getByStatus(@PathVariable PaymentStatus status) {
        return service.getByStatus(status);
    }

    // PATCH /payments/1/status?status=REFUNDED
    @PatchMapping("/{id}/status")
    public Payment updateStatus(@PathVariable Long id, @RequestParam PaymentStatus status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Payment deleted successfully";
    }
}

