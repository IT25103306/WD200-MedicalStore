package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.dto.OrderRequest;
import com.WD200.MedicalStore.model.Order;
import com.WD200.MedicalStore.service.OrderService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/orders")
@CrossOrigin
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    /*
      POST /orders
      {
        "userId": 1,
        "deliveryAddress": "123 Main St, Kandy",
        "notes": "Ring doorbell",
        "items": [
          { "medicineId": 1, "quantity": 2 },
          { "medicineId": 3, "quantity": 1 }
        ]
      }
    */
    @PostMapping
    public Order create(@RequestBody OrderRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<Order> getAll() { return service.getAll(); }

    @GetMapping("/{id}")
    public Order getById(@PathVariable Long id) { return service.getById(id); }

    @GetMapping("/user/{userId}")
    public List<Order> getByUser(@PathVariable Long userId) {
        return service.getByUser(userId);
    }

    @GetMapping("/status/{status}")
    public List<Order> getByStatus(@PathVariable String status) {
        return service.getByStatus(status);
    }

    // PATCH /orders/1/status?status=SHIPPED
    @PatchMapping("/{id}/status")
    public Order updateStatus(@PathVariable Long id, @RequestParam String status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Order deleted successfully";
    }
}