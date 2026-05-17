package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.model.Medicine;
import com.WD200.MedicalStore.service.MedicineService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/medicines")
@CrossOrigin
public class MedicineController {

    private final MedicineService service;

    public MedicineController(MedicineService service) {
        this.service = service;
    }

    @PostMapping
    public Medicine create(@Valid @RequestBody Medicine medicine) {
        return service.create(medicine);
    }

    @GetMapping
    public List<Medicine> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Medicine getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/search")
    public List<Medicine> search(@RequestParam(required = false) String name,
                                 @RequestParam(required = false) String category,
                                 @RequestParam(required = false) String manufacturer) {
        if (name != null)         return service.searchByName(name);
        if (category != null)     return service.searchByCategory(category);
        if (manufacturer != null) return service.searchByManufacturer(manufacturer);
        return service.getAll();
    }

    @GetMapping("/prescription-required")
    public List<Medicine> getPrescriptionRequired() {
        return service.getPrescriptionMedicines();
    }

    @PutMapping("/{id}")
    public Medicine update(@PathVariable Long id, @Valid @RequestBody Medicine medicine) {
        return service.update(id, medicine);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Medicine deleted successfully";
    }
}