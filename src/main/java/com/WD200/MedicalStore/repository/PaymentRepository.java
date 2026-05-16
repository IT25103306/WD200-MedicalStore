// Payment Repository - Managed by IT25103696

package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.Payment;
import com.WD200.MedicalStore.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByOrder_Id(Long orderId);
    List<Payment> findByStatus(PaymentStatus status);
}
