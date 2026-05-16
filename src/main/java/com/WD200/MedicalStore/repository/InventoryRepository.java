package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    // ✅ Uses medicine object relationship
    Optional<Inventory> findByMedicine_Id(Long medicineId);

    List<Inventory> findByExpiryDateBefore(LocalDate date);

    // ✅ Low stock alert query
    @Query("SELECT i FROM Inventory i WHERE i.quantity <= i.reorderLevel")
    List<Inventory> findLowStockItems();


}
