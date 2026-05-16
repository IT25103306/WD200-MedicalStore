package com.WD200.MedicalStore.service;

import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.Inventory;
import com.WD200.MedicalStore.model.Medicine;
import com.WD200.MedicalStore.repository.InventoryRepository;
import com.WD200.MedicalStore.repository.MedicineRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryRepository repo;
    private final MedicineRepository medicineRepo;

    public InventoryService(InventoryRepository repo, MedicineRepository medicineRepo) {
        this.repo = repo;
        this.medicineRepo = medicineRepo;
    }

    public Inventory create(Long medicineId, Integer quantity,
                            Integer reorderLevel, LocalDate expiryDate) {
        Medicine medicine = medicineRepo.findById(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + medicineId));

        Inventory inventory = new Inventory(medicine, quantity, reorderLevel, expiryDate);
        return repo.save(inventory);
    }

    public List<Inventory> getAll() {
        return repo.findAll();
    }

    public Inventory getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found: " + id));
    }

    public Inventory getByMedicineId(Long medicineId) {
        return repo.findByMedicine_Id(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No inventory for medicine: " + medicineId));
    }

    public List<Inventory> getExpired() {
        return repo.findByExpiryDateBefore(LocalDate.now());
    }

    public List<Inventory> getLowStock() {
        return repo.findLowStockItems();
    }

    public Inventory update(Long id, Integer quantity, Integer reorderLevel, LocalDate expiryDate) {
        Inventory existing = getById(id);
        existing.setQuantity(quantity);
        if (reorderLevel != null) existing.setReorderLevel(reorderLevel);
        if (expiryDate != null) existing.setExpiryDate(expiryDate);
        existing.setLastUpdated(LocalDate.now());

        // ✅ Low stock warning
        if (existing.isLowStock()) {
            System.out.println("⚠️  LOW STOCK: " +
                    existing.getMedicine().getName() +
                    " — only " + existing.getQuantity() + " units left.");
        }
        return repo.save(existing);
    }

    // ✅ Used internally by OrderService
    public void deductStock(Long medicineId, Integer quantity) {
        Inventory inventory = getByMedicineId(medicineId);
        if (inventory.getQuantity() < quantity)
            throw new IllegalStateException(
                    "Insufficient stock for: " + inventory.getMedicine().getName() +
                            ". Available: " + inventory.getQuantity() + ", Requested: " + quantity);

        inventory.setQuantity(inventory.getQuantity() - quantity);
        inventory.setLastUpdated(LocalDate.now());

        if (inventory.isLowStock()) {
            System.out.println("⚠️  LOW STOCK: " +
                    inventory.getMedicine().getName() +
                    " — only " + inventory.getQuantity() + " units left.");
        }
        repo.save(inventory);
    }

    public void delete(Long id) {
        repo.delete(getById(id));
    }
}