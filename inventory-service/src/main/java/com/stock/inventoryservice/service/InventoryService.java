package com.stock.inventoryservice.service;

import com.stock.inventoryservice.dto.*;
import com.stock.inventoryservice.dto.request.InventoryAdjustmentRequest;
import com.stock.inventoryservice.dto.request.InventoryCreateRequest;
import com.stock.inventoryservice.dto.request.InventoryTransferRequest;
import com.stock.inventoryservice.dto.request.InventoryUpdateRequest;
import com.stock.inventoryservice.dto.request.QualityAdjustmentRequest;

import java.util.List;

public interface InventoryService {

    // CRUD Operations
    InventoryDTO createInventory(InventoryCreateRequest request);
    InventoryDTO getInventoryById(String id);
    List<InventoryDTO> getAllInventories();

    // Query Operations
    List<InventoryDTO> getInventoriesByItemId(String itemId);
    List<InventoryDTO> getInventoriesByWarehouseId(String warehouseId);
    List<InventoryDTO> getInventoriesByLocationId(String locationId);
    InventoryDTO getInventoryByItemAndLocation(String itemId, String locationId);
    List<InventoryDTO> getLowStockItems(Double threshold);
    List<InventoryDTO> getExpiringItems(int daysFromNow);

    // Inventory Adjustments
    InventoryDTO adjustQuantity(String id, InventoryAdjustmentRequest request);
    InventoryDTO reserveQuantity(String id, Double quantity);
    InventoryDTO releaseReservation(String id, Double quantity);

    // Transfer Operations
    InventoryDTO transferInventory(InventoryTransferRequest request);

    // Update & Delete
    InventoryDTO updateInventory(String id, InventoryUpdateRequest request);
    void deleteInventory(String id);

    // Enriched Responses (with Item details from cache)
    InventoryWithItemDTO getInventoryWithItem(String id);
    List<InventoryWithItemDTO> getInventoriesWithItemByLocation(String locationId);
    List<InventoryWithItemDTO> getInventoriesWithItemByWarehouse(String warehouseId);

    // Stock Availability
    boolean checkStockAvailability(String itemId, String locationId, Double quantity);
    Double getAvailableQuantity(String itemId, String locationId);

    // Quality Control Integration
    void adjustInventoryForQuality(QualityAdjustmentRequest request);
}
