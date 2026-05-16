package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUser_Id(Long userId);
    List<Order> findByStatusIgnoreCase(String status);
}