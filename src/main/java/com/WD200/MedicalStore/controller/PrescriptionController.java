package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.model.Prescription;
import com.WD200.MedicalStore.service.PrescriptionService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/prescriptions")
@CrossOrigin
public class PrescriptionController {

    private final PrescriptionService service;

    public PrescriptionController(PrescriptionService service) {
        this.service = service;
    }

    @PostMapping
    public Prescription create(@RequestBody Prescription p) {
        return service.create(p);
    }

    @GetMapping
    public List<Prescription> getAll() { return service.getAll(); }

    @GetMapping("/{id}")
    public Prescription getById(@PathVariable Long id) { return service.getById(id); }

    @GetMapping("/user/{userId}")
    public List<Prescription> getByUser(@PathVariable Long userId) {
        return service.getByUser(userId);
    }

    @GetMapping("/status/{status}")
    public List<Prescription> getByStatus(@PathVariable String status) {
        return service.getByStatus(status);
    }

    @PutMapping("/{id}")
    public Prescription update(@PathVariable Long id, @RequestBody Prescription p) {
        return service.update(id, p);
    }

    // PATCH /prescriptions/1/status?status=APPROVED
    @PatchMapping("/{id}/status")
    public Prescription updateStatus(@PathVariable Long id, @RequestParam String status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Prescription deleted successfully";
    }
}