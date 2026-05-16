// Medicine service - Managed by IT25100045

package com.WD200.MedicalStore.service;

import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.Medicine;
import com.WD200.MedicalStore.repository.MedicineRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service

public class MedicineService {

    private final MedicineRepository repo;

    public MedicineService(MedicineRepository repo) {
        this.repo = repo;
    }

    public Medicine create(Medicine medicine) {
        return repo.save(medicine);
    }

    public List<Medicine> getAll() {
        return repo.findAll();
    }

    public Medicine getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));
    }

    public List<Medicine> searchByName(String name) {
        return repo.findByNameContainingIgnoreCase(name);
    }

    public List<Medicine> searchByCategory(String category) {
        return repo.findByCategoryIgnoreCase(category);
    }

    public List<Medicine> searchByManufacturer(String manufacturer) {
        return repo.findByManufacturerIgnoreCase(manufacturer);
    }

    public List<Medicine> getPrescriptionMedicines() {
        return repo.findByPrescriptionRequired(true);
    }

    public Medicine update(Long id, Medicine newData) {
        Medicine existing = getById(id);
        existing.setName(newData.getName());
        existing.setCategory(newData.getCategory());
        existing.setManufacturer(newData.getManufacturer());
        existing.setDescription(newData.getDescription());
        existing.setPrice(newData.getPrice());
        existing.setExpiryDate(newData.getExpiryDate());
        existing.setPrescriptionRequired(newData.isPrescriptionRequired());
        return repo.save(existing);
    }

    public void delete(Long id) {
        repo.delete(getById(id));
    }
}