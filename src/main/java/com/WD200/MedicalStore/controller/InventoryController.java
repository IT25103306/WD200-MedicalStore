package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.model.Inventory;
import com.WD200.MedicalStore.service.InventoryService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/inventory")
@CrossOrigin
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    // POST /inventory?medicineId=1&quantity=100&reorderLevel=10&expiryDate=2026-12-31
    @PostMapping
    public Inventory create(@RequestParam Long medicineId,
                            @RequestParam Integer quantity,
                            @RequestParam(defaultValue = "10") Integer reorderLevel,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                            LocalDate expiryDate) {
        return service.create(medicineId, quantity, reorderLevel, expiryDate);
    }

    @GetMapping
    public List<Inventory> getAll() { return service.getAll(); }

    @GetMapping("/{id}")
    public Inventory getById(@PathVariable Long id) { return service.getById(id); }

    @GetMapping("/medicine/{medicineId}")
    public Inventory getByMedicine(@PathVariable Long medicineId) {
        return service.getByMedicineId(medicineId);
    }

    @GetMapping("/expired")
    public List<Inventory> getExpired() { return service.getExpired(); }

    @GetMapping("/low-stock")
    public List<Inventory> getLowStock() { return service.getLowStock(); }

    // PUT /inventory/1?quantity=50&reorderLevel=10&expiryDate=2026-12-31
    @PutMapping("/{id}")
    public Inventory update(@PathVariable Long id,
                            @RequestParam Integer quantity,
                            @RequestParam(required = false) Integer reorderLevel,
                            @RequestParam(required = false)
                            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                            LocalDate expiryDate) {
        return service.update(id, quantity, reorderLevel, expiryDate);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Inventory record deleted successfully";
    }
}
