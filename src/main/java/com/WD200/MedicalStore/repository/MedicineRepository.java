// Medicine repository - Managed by IT25100045

package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    List<Medicine> findByNameContainingIgnoreCase(String name);
    List<Medicine> findByCategoryIgnoreCase(String category);
    List<Medicine> findByManufacturerIgnoreCase(String manufacturer);
    List<Medicine> findByPrescriptionRequired(boolean required);
}
