package com.WD200.MedicalStore.service;

import com.WD200.MedicalStore.dto.OrderRequest;
import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.*;
import com.WD200.MedicalStore.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final MedicineRepository medicineRepo;
    private final UserRepository userRepo;
    private final InventoryService inventoryService;

    public OrderService(OrderRepository orderRepo,
                        MedicineRepository medicineRepo,
                        UserRepository userRepo,
                        InventoryService inventoryService) {
        this.orderRepo = orderRepo;
        this.medicineRepo = medicineRepo;
        this.userRepo = userRepo;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public Order create(OrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty())
            throw new IllegalArgumentException("Order must contain at least one item.");

        User user = userRepo.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + request.getUserId()));

        Order order = new Order();
        order.setUser(user);
        order.setOrderDate(LocalDate.now());
        order.setStatus("PENDING");
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setNotes(request.getNotes());

        double total = 0.0;

        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepo.findById(itemReq.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Medicine not found: " + itemReq.getMedicineId()));

            // ✅ Check prescription requirement
            if (medicine.isPrescriptionRequired()) {
                // Future: validate prescription exists for this user/medicine
                System.out.println("ℹ️  Prescription required for: " + medicine.getName());
            }

            // ✅ Deduct from inventory (throws if insufficient stock)
            inventoryService.deductStock(medicine.getId(), itemReq.getQuantity());

            OrderItem item = new OrderItem(
                    order,
                    medicine,
                    itemReq.getQuantity(),
                    medicine.getPrice()
            );
            order.getItems().add(item);
            total += item.getSubtotal();
        }

        order.setTotalPrice(total);
        return orderRepo.save(order);
    }

    public List<Order> getAll() {
        return orderRepo.findAll();
    }

    public Order getById(Long id) {
        return orderRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
    }

    public List<Order> getByUser(Long userId) {
        return orderRepo.findByUser_Id(userId);
    }

    public List<Order> getByStatus(String status) {
        return orderRepo.findByStatusIgnoreCase(status);
    }

    public Order updateStatus(Long id, String status) {
        Order existing = getById(id);
        existing.setStatus(status.toUpperCase());
        return orderRepo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        orderRepo.delete(getById(id));
    }
}