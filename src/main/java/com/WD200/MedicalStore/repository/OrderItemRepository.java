package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrder_Id(Long orderId);
    List<OrderItem> findByMedicine_Id(Long medicineId);
}